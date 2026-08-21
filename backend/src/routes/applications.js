import { Router } from "express";
import { createApplicationSchema, applicantFeaturesSchema, reviewerDecisionSchema } from "../schemas/applicationSchema.js";
import { stripProtectedAttributes } from "../guardrails/stripProtectedAttributes.js";
import { scoreApplicant, counterfactual as runCounterfactual, ModelServiceError } from "../services/modelServiceClient.js";
import { getLLMProvider } from "../services/llm/index.js";
import { getEmailOtpProvider } from "../services/emailOtp/index.js";
import { detectFraudSignals } from "../fraud/detectSignals.js";
import { pool } from "../db/pool.js";
import {
  insertApplication,
  insertAuditLogEntry,
  insertEmbedding,
  findSimilarApplications,
  listApplications,
  getApplicationById,
  setReviewerDecision,
} from "../db/applicationsRepository.js";
import { findApplicantByEmail, createApplicantAccount } from "../db/applicantAccountsRepository.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireApplicantAuth } from "../middleware/requireApplicantAuth.js";

export const applicationsRouter = Router();

// Applicants must verify their email (OTP) before submitting -- see
// routes/applicantAuth.js. The applicant_accounts row itself is created
// here, on first submission, rather than at verify-otp time -- so a
// returning applicant never has to re-enter their name, and a first-time
// visitor who verifies but never applies never gets an account at all.
applicationsRouter.post("/", requireApplicantAuth, async (req, res) => {
  const parsed = createApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  const { applicant, transactionNarrative, applicantName } = parsed.data;

  try {
    let account = await findApplicantByEmail(req.applicant.email);
    if (!account) {
      if (!applicantName) {
        return res.status(400).json({ error: "Name is required for a new account" });
      }
      account = await createApplicantAccount(req.applicant.email, applicantName);
    }

    const { text: strippedNarrative, redactionCount } = stripProtectedAttributes(transactionNarrative);

    const scoreResult = await scoreApplicant(applicant);

    // Runs against existing rows before this application is inserted, so
    // the duplicate-narrative and velocity checks can't match themselves.
    const fraudFlags = await detectFraudSignals(pool, {
      features: applicant,
      narrative: strippedNarrative || null,
      applicantId: account.id,
    });

    const llm = getLLMProvider();
    const { explanation, modelId } = await llm.generateExplanation({
      probability: scoreResult.probability_of_default,
      riskTier: scoreResult.risk_tier,
      topFeatures: scoreResult.top_contributing_features,
    });

    const application = await insertApplication({
      features: applicant,
      transactionNarrative: strippedNarrative || null,
      probabilityOfDefault: scoreResult.probability_of_default,
      riskTier: scoreResult.risk_tier,
      explanation,
      topContributingFeatures: scoreResult.top_contributing_features,
      fraudFlags,
      applicantId: account.id,
    });

    await insertAuditLogEntry({
      applicationId: application.id,
      probabilityOfDefault: scoreResult.probability_of_default,
      riskTier: scoreResult.risk_tier,
      explanation,
      shapValues: scoreResult.top_contributing_features,
      llmProvider: llm.name,
      llmModelId: modelId,
      guardrailRedactionsMade: redactionCount,
    });

    let cohort = [];
    if (strippedNarrative) {
      const { embedding } = await llm.embed(strippedNarrative);
      await insertEmbedding(application.id, embedding);
      cohort = await findSimilarApplications(application.id);
    }

    // Fire-and-forget: the applicant already has their decision in this
    // response, so a slow or failed email shouldn't delay or fail the
    // request. Logged, not surfaced -- matches the OTP provider's own
    // best-effort delivery model.
    getEmailOtpProvider()
      .sendDecisionEmail({
        email: req.applicant.email,
        name: account.name,
        riskTier: scoreResult.risk_tier,
        probabilityOfDefault: scoreResult.probability_of_default,
        explanation,
        topContributingFeatures: scoreResult.top_contributing_features,
      })
      .catch((err) => console.error("Failed to send decision email:", err));

    // Every submission notifies the reviewer inbox, whether the applicant
    // is new or returning -- lets a reviewer catch a fresh Manual Review
    // case without having to poll the dashboard.
    getEmailOtpProvider()
      .sendReviewerNotification({
        applicationId: application.id,
        applicantName: account.name,
        applicantEmail: account.email,
        riskTier: scoreResult.risk_tier,
        probabilityOfDefault: scoreResult.probability_of_default,
        fraudFlags,
      })
      .catch((err) => console.error("Failed to send reviewer notification:", err));

    res.status(201).json({
      id: application.id,
      createdAt: application.created_at,
      probabilityOfDefault: scoreResult.probability_of_default,
      riskTier: scoreResult.risk_tier,
      explanation,
      topContributingFeatures: scoreResult.top_contributing_features,
      cohort,
    });
  } catch (err) {
    // 23503 on applications_applicant_id_fkey means the JWT verified fine
    // but the account it points to no longer exists (e.g. wiped by a DB
    // reset since the token was issued) -- a stale session, not a server
    // error, so send the applicant back to re-verify instead of a 502.
    if (err.code === "23503" && err.constraint === "applications_applicant_id_fkey") {
      return res.status(401).json({ error: "Your session is no longer valid. Please verify your email again." });
    }
    console.error("Failed to process application:", err);
    res.status(502).json({ error: "Failed to process application" });
  }
});

applicationsRouter.post("/counterfactual", async (req, res) => {
  const { applicant, featureToPerturb, newValue } = req.body ?? {};
  const parsed = applicantFeaturesSchema.safeParse(applicant);
  if (!parsed.success || typeof featureToPerturb !== "string" || typeof newValue !== "number") {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    const result = await runCounterfactual(parsed.data, featureToPerturb, newValue);
    res.json(result);
  } catch (err) {
    console.error("Counterfactual failed:", err);
    if (err instanceof ModelServiceError && err.status === 400) {
      return res.status(400).json({ error: "Invalid feature name" });
    }
    res.status(502).json({ error: "Failed to compute counterfactual" });
  }
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Dashboard routes: reviewer auth required.
applicationsRouter.get("/", requireAuth, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  try {
    const applications = await listApplications({ limit, offset });
    res.json({ applications });
  } catch (err) {
    console.error("Failed to list applications:", err);
    res.status(500).json({ error: "Failed to list applications" });
  }
});

applicationsRouter.get("/:id", requireAuth, async (req, res) => {
  if (!UUID_PATTERN.test(req.params.id)) {
    return res.status(400).json({ error: "Invalid application id" });
  }

  try {
    const application = await getApplicationById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }
    res.json(application);
  } catch (err) {
    console.error("Failed to fetch application:", err);
    res.status(500).json({ error: "Failed to fetch application" });
  }
});

// Human-in-the-loop closure for the Manual Review tier -- the model's
// risk_tier is never overwritten, this records what a reviewer decided
// to do about it. Only valid on applications currently in Manual Review
// with no existing decision (enforced by setReviewerDecision's WHERE
// clause, not just at this layer -- prevents a race between two
// reviewers both approving the same application).
applicationsRouter.patch("/:id/decision", requireAuth, async (req, res) => {
  if (!UUID_PATTERN.test(req.params.id)) {
    return res.status(400).json({ error: "Invalid application id" });
  }

  const parsed = reviewerDecisionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  try {
    const updated = await setReviewerDecision(req.params.id, parsed.data.decision, req.reviewer.sub);
    if (!updated) {
      const existing = await getApplicationById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Application not found" });
      }
      if (existing.risk_tier !== "Manual Review") {
        return res.status(409).json({ error: "Only Manual Review applications can be decided" });
      }
      return res.status(409).json({ error: "This application has already been decided", reviewerDecision: existing.reviewer_decision });
    }
    res.json(updated);
  } catch (err) {
    console.error("Failed to record reviewer decision:", err);
    res.status(500).json({ error: "Failed to record decision" });
  }
});
