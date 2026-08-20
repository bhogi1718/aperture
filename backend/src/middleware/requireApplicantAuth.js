import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/**
 * Verifies an applicant session token (issued after OTP verification).
 * Uses a separate secret from the reviewer's requireAuth middleware so
 * the two token types are never interchangeable, even if a `role` claim
 * were forged or misread.
 */
export function requireApplicantAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = header.slice("Bearer ".length);
  try {
    req.applicant = jwt.verify(token, env.applicantJwtSecret);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
