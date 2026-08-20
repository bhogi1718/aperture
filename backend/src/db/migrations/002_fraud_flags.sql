-- Lightweight fraud-mitigation signal: flags applications with implausible
-- alt-data combinations or duplicate submission patterns. These are
-- heuristic signals surfaced to the reviewer, not automated rejections --
-- the scoring model and risk tier are computed independently and are
-- never altered by a fraud flag.

ALTER TABLE applications
    ADD COLUMN fraud_flags TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX idx_applications_fraud_flags ON applications USING gin (fraud_flags);

-- Supports the duplicate-narrative check: fast lookup of recent
-- transaction_narrative values without a full table scan.
CREATE INDEX idx_applications_narrative_recent ON applications (transaction_narrative, created_at DESC)
    WHERE transaction_narrative IS NOT NULL;
