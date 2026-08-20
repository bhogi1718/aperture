import { pool } from "./pool.js";

const OTP_EXPIRY_MINUTES = 5;
const OTP_REQUEST_COOLDOWN_SECONDS = 60;
const MAX_VERIFY_ATTEMPTS = 5;

export async function canRequestOtp(email) {
  const { rows } = await pool.query(
    `SELECT created_at FROM otp_codes
     WHERE email = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [email]
  );
  if (rows.length === 0) return true;

  const secondsSinceLast = (Date.now() - new Date(rows[0].created_at).getTime()) / 1000;
  return secondsSinceLast >= OTP_REQUEST_COOLDOWN_SECONDS;
}

export async function createOtpCode(email, code) {
  const { rows } = await pool.query(
    `INSERT INTO otp_codes (email, code, expires_at)
     VALUES ($1, $2, now() + ($3 || ' minutes')::interval)
     RETURNING id, expires_at`,
    [email, code, OTP_EXPIRY_MINUTES]
  );
  return rows[0];
}

/**
 * Verifies a code against the most recent unverified, unexpired OTP for
 * this email. Increments the attempt counter on every check (including
 * failures) so a code can be locked out after MAX_VERIFY_ATTEMPTS guesses.
 * @returns {Promise<"ok" | "not_found" | "expired" | "too_many_attempts" | "incorrect">}
 */
export async function verifyOtpCode(email, code) {
  const { rows } = await pool.query(
    `SELECT id, code, expires_at, attempts FROM otp_codes
     WHERE email = $1 AND verified_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [email]
  );
  if (rows.length === 0) return "not_found";

  const otp = rows[0];
  if (otp.attempts >= MAX_VERIFY_ATTEMPTS) return "too_many_attempts";
  if (new Date(otp.expires_at) < new Date()) return "expired";

  await pool.query(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1`, [otp.id]);

  if (otp.code !== code) return "incorrect";

  await pool.query(`UPDATE otp_codes SET verified_at = now() WHERE id = $1`, [otp.id]);
  return "ok";
}

export async function findApplicantByEmail(email) {
  const { rows } = await pool.query(`SELECT id, email, name, created_at FROM applicant_accounts WHERE email = $1`, [email]);
  return rows[0] ?? null;
}

export async function createApplicantAccount(email, name) {
  const { rows } = await pool.query(
    `INSERT INTO applicant_accounts (email, name) VALUES ($1, $2) RETURNING id, email, name, created_at`,
    [email, name]
  );
  return rows[0];
}

export async function touchApplicantLogin(applicantId) {
  await pool.query(`UPDATE applicant_accounts SET last_login_at = now() WHERE id = $1`, [applicantId]);
}

export async function listApplicationsForApplicant(applicantId) {
  const { rows } = await pool.query(
    `SELECT id, created_at, risk_tier, probability_of_default, explanation
     FROM applications
     WHERE applicant_id = $1
     ORDER BY created_at DESC`,
    [applicantId]
  );
  return rows;
}
