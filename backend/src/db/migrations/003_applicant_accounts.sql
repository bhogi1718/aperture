-- Applicant identity: phone-verified accounts, separate from the single
-- reviewer credential (env-configured, no table). A verified phone number
-- becomes a durable identity so a returning applicant can see their past
-- applications, and so the fraud-signal layer has a real identity to key
-- off later (today's duplicate-narrative check only matches on text).

CREATE TABLE applicant_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ
);

-- One-time codes for phone verification. A row is created per OTP request;
-- verified rows are kept (not deleted) as an audit trail of verification
-- attempts, consistent with this project's "log everything" posture
-- elsewhere (audit_log, fraud_flags).
CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_otp_codes_phone_created ON otp_codes (phone, created_at DESC);

-- Links an application to the verified identity that submitted it.
-- Nullable: applications submitted before this feature existed (or any
-- future anonymous path) have no applicant_id.
ALTER TABLE applications
    ADD COLUMN applicant_id UUID REFERENCES applicant_accounts(id);

CREATE INDEX idx_applications_applicant_id ON applications (applicant_id);
