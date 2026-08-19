import { Router } from "express";
import { createApplicationSchema, applicantFeaturesSchema } from "../schemas/applicationSchema.js";
import { stripProtectedAttributes } from "../guardrails/stripProtectedAttributes.js";
import { scoreApplicant, counterfactual as runCounterfactual } from "../services/modelServiceClient.js";
import { getLLMProvider } from "../services/llm/index.js";
import {
  insertApplication,
  insertAuditLogEntry,
  insertEmbedding,
  findSimilarApplications,
  listApplications,
  getApplicationById,
} from "../db/applicationsRepository.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const applicationsRouter = Router();

// Public: applicants submit without logging in.
applicationsRouter.post("/", async (req, res) => {
  const parsed = createApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  const { applicant, transactionNarrative } = parsed.data;

  try {
    const { text: strippedNarrative, redactionCount } = stripProtectedAttributes(transactionNarrative);

    const scoreResult = await scoreApplicant(applicant);

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
    res.status(502).json({ error: "Failed to compute counterfactual" });
  }
});

// Dashboard routes: reviewer auth required.
applicationsRouter.get("/", requireAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  const applications = await listApplications({ limit, offset });
  res.json({ applications });
});

applicationsRouter.get("/:id", requireAuth, async (req, res) => {
  const application = await getApplicationById(req.params.id);
  if (!application) {
    return res.status(404).json({ error: "Application not found" });
  }
  res.json(application);
});
