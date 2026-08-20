import { Router } from "express";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { getOtpProvider } from "../services/otp/index.js";
import {
  canRequestOtp,
  createOtpCode,
  verifyOtpCode,
  findApplicantByPhone,
  createApplicantAccount,
  touchApplicantLogin,
  listApplicationsForApplicant,
} from "../db/applicantAccountsRepository.js";
import { requireApplicantAuth } from "../middleware/requireApplicantAuth.js";

export const applicantAuthRouter = Router();

// E.164-ish: + followed by 8-15 digits. Not exhaustive phone validation,
// just enough to reject obviously malformed input before it reaches an
// OTP provider (and, eventually, a real per-message cost).
export const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

export const requestOtpSchema = z.object({
  phone: z.string().regex(PHONE_PATTERN, "Phone number must be in international format, e.g. +919876543210"),
  name: z.string().trim().min(1).max(100),
});

applicantAuthRouter.post("/request-otp", async (req, res) => {
  const parsed = requestOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  const { phone, name } = parsed.data;

  try {
    const allowed = await canRequestOtp(phone);
    if (!allowed) {
      return res.status(429).json({ error: "Please wait before requesting another code" });
    }

    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    const { expires_at } = await createOtpCode(phone, code);

    // The name isn't persisted until verification succeeds (createApplicantAccount),
    // so a re-request just needs the phone; name is re-validated at verify time.
    const otp = getOtpProvider();
    await otp.sendCode({ phone, code });

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
  phone: z.string().regex(PHONE_PATTERN),
  name: z.string().trim().min(1).max(100),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

applicantAuthRouter.post("/verify-otp", async (req, res) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  const { phone, name, code } = parsed.data;

  try {
    const result = await verifyOtpCode(phone, code);
    if (result === "not_found") {
      return res.status(400).json({ error: "No verification code found for this number. Request a new one." });
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

    let applicant = await findApplicantByPhone(phone);
    const isReturning = Boolean(applicant);
    if (!applicant) {
      applicant = await createApplicantAccount(phone, name);
    } else {
      await touchApplicantLogin(applicant.id);
    }

    const token = jwt.sign({ sub: applicant.id, phone: applicant.phone, role: "applicant" }, env.applicantJwtSecret, {
      expiresIn: "24h",
    });

    const applications = isReturning ? await listApplicationsForApplicant(applicant.id) : [];

    res.json({
      token,
      applicant: { id: applicant.id, name: applicant.name, phone: applicant.phone },
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
