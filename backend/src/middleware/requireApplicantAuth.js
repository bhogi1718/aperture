import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/**
 * Verifies an applicant session token (issued after OTP verification).
 * Uses a separate secret from the reviewer's requireAuth middleware, and
 * both middlewares additionally check the `role` claim, so the two token
 * types are never interchangeable even if the secrets ever collided.
 */
export function requireApplicantAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, env.applicantJwtSecret, { algorithms: ["HS256"] });
    if (payload.role !== "applicant") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    req.applicant = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
