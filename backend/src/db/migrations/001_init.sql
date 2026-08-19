-- Aperture initial schema: applications, audit log, and embeddings for
-- pgvector cohort search.

CREATE EXTENSION IF NOT EXISTS vector;

-- Note: the single reviewer account is configured via environment variables
-- (REVIEWER_USERNAME / REVIEWER_PASSWORD_HASH), not a database table --
-- there is no self-service signup, so a table would only add an unused
-- indirection for one fixed credential pair.

CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Structured features sent to the scoring model, stored verbatim so a
    -- past application can be re-scored or audited without re-deriving inputs.
    features JSONB NOT NULL,

    -- Free-text transaction narrative, guardrail-stripped before it ever
    -- reaches an LLM prompt. Stored post-stripping only -- the raw
    -- pre-strip text is never persisted.
    transaction_narrative TEXT,

    probability_of_default DOUBLE PRECISION NOT NULL,
    risk_tier TEXT NOT NULL CHECK (risk_tier IN ('Approve', 'Manual Review', 'Reject')),
    explanation TEXT,
    top_contributing_features JSONB
);

CREATE INDEX idx_applications_created_at ON applications (created_at DESC);
CREATE INDEX idx_applications_risk_tier ON applications (risk_tier);

-- Append-only compliance trail: every score + explanation pair the system
-- has ever produced, regardless of whether the application record is later
-- modified. Nothing in this table should ever be UPDATEd or DELETEd.
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    probability_of_default DOUBLE PRECISION NOT NULL,
    risk_tier TEXT NOT NULL,
    explanation TEXT NOT NULL,
    shap_values JSONB NOT NULL,
    llm_provider TEXT NOT NULL,
    llm_model_id TEXT,

    -- Guardrail bookkeeping: did the stripping step actually remove anything
    -- from the narrative before it reached the LLM prompt.
    guardrail_redactions_made INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_audit_log_application_id ON audit_log (application_id);

-- pgvector embeddings of each applicant's transaction narrative, used for
-- cohort similarity search against past applicants.
CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL UNIQUE REFERENCES applications(id),
    embedding VECTOR(1536) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
