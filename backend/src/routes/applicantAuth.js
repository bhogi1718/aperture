import { Router } from "express";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { getEmailOtpProvider } from "../services/emailOtp/index.js";
import {
  canRequestOtp,
  createOtpCode,
  verifyOtpCode,
  findApplicantByEmail,
  createApplicantAccount,
  touchApplicantLogin,
  listApplicationsForApplicant,
} from "../db/applicantAccountsRepository.js";
import { requireApplicantAuth } from "../middleware/requireApplicantAuth.js";

export const applicantAuthRouter = Router();

export const requestOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  name: z.string().trim().min(1).max(100),
});

// Per-email cooldown (canRequestOtp) stops rapid resends to one address, but
// says nothing about one IP hitting many addresses -- this caps requests per
// IP so a single client can't use the endpoint to flood arbitrary inboxes or
// run up the SMTP account's send volume.
const requestOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many verification requests from this device. Try again later." },
});

applicantAuthRouter.post("/request-otp", requestOtpLimiter, async (req, res) => {
  const parsed = requestOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  const { email, name } = parsed.data;

  try {
    const allowed = await canRequestOtp(email);
    if (!allowed) {
      return res.status(429).json({ error: "Please wait before requesting another code" });
    }

    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    const { expires_at } = await createOtpCode(email, code);

    // The name isn't persisted until verification succeeds (createApplicantAccount),
    // so a re-request just needs the email; name is re-validated at verify time.
    const otp = getEmailOtpProvider();
    await otp.sendCode({ email, code });

    const response = { message: "Verification code sent", expiresAt: expires_at };
    if (env.nodeEnv !== "production" && otp.name === "mock") {
      response.devCode = code;
    }
    res.status(202).json(response);
  } catch (err) {
    console.error("Failed to send OTP:", err);
    res.status(502).json({ error: "Failed to send verification code" });
  }
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(100),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

applicantAuthRouter.post("/verify-otp", async (req, res) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  const { email, name, code } = parsed.data;

  try {
    const result = await verifyOtpCode(email, code);
    if (result === "not_found") {
      return res.status(400).json({ error: "No verification code found for this email. Request a new one." });
    }
    if (result === "expired") {
      return res.status(400).json({ error: "Verification code expired. Request a new one." });
    }
    if (result === "too_many_attempts") {
      return res.status(429).json({ error: "Too many incorrect attempts. Request a new code." });
    }
    if (result === "incorrect") {
      return res.status(400).json({ error: "Incorrect code" });
    }

    let applicant = await findApplicantByEmail(email);
    const isReturning = Boolean(applicant);
    if (!applicant) {
      applicant = await createApplicantAccount(email, name);
    } else {
      await touchApplicantLogin(applicant.id);
    }

    const token = jwt.sign({ sub: applicant.id, email: applicant.email, role: "applicant" }, env.applicantJwtSecret, {
      expiresIn: "24h",
    });

    const applications = isReturning ? await listApplicationsForApplicant(applicant.id) : [];

    res.json({
      token,
      applicant: { id: applicant.id, name: applicant.name, email: applicant.email },
      isReturning,
      applications,
    });
  } catch (err) {
    console.error("Failed to verify OTP:", err);
    res.status(502).json({ error: "Failed to verify code" });
  }
});

applicantAuthRouter.get("/me/applications", requireApplicantAuth, async (req, res) => {
  try {
    const applications = await listApplicationsForApplicant(req.applicant.sub);
    res.json({ applications });
  } catch (err) {
    console.error("Failed to list applicant's applications:", err);
    res.status(500).json({ error: "Failed to load applications" });
  }
});
