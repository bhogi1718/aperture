-- Switches applicant verification from phone/WhatsApp to email, per
-- explicit decision after hitting Meta WhatsApp Business API's
-- verification requirements (unverified apps can only message up to 5
-- manually-added test recipients -- a real blocker for a hackathon demo
-- where judges may want to try an arbitrary number). Email OTP has no
-- equivalent recipient allowlist.

ALTER TABLE applicant_accounts RENAME COLUMN phone TO email;
ALTER TABLE otp_codes RENAME COLUMN phone TO email;

-- Postgres auto-renames the unique constraint/index along with the column,
-- but not their names -- rename them to match for clarity going forward.
ALTER INDEX applicant_accounts_phone_key RENAME TO applicant_accounts_email_key;
ALTER INDEX idx_otp_codes_phone_created RENAME TO idx_otp_codes_email_created;
