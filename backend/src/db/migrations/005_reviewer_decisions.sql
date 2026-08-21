-- Human-in-the-loop closure for the "Manual Review" tier: the model flags
-- ambiguous applications for a person to decide, but until now there was
-- no way to record that decision. reviewer_decision is independent of
-- risk_tier (the model's output is never overwritten) -- it's an
-- additional, auditable field capturing what a human reviewer decided to
-- do about a tier the model itself couldn't confidently resolve.

ALTER TABLE applications
    ADD COLUMN reviewer_decision TEXT
        CHECK (reviewer_decision IN ('Approved', 'Rejected')),
    ADD COLUMN reviewer_decided_at TIMESTAMPTZ,
    ADD COLUMN reviewer_username TEXT;

CREATE INDEX idx_applications_reviewer_decision ON applications (reviewer_decision);
