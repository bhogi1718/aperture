# Aperture — Architecture & System Design

This document details the system design, data flows, security boundaries, and design trade-offs of the Aperture Underwriting Engine.

## 1. High-Level System Architecture

```
┌─────────────────────────┐         HTTP         ┌─────────────────────────┐         HTTP         ┌─────────────────────────┐
│     React 19 Frontend   │─────────────────────▶│    Express API Gateway  │─────────────────────▶│  FastAPI Model Service  │
│  - Email OTP Flow       │◀─────────────────────│  - Dual JWT Auth        │◀─────────────────────│  - XGBoost Scorer       │
│  - Dynamic Form         │       JSON           │  - Bias Guardrails      │       JSON           │  - TreeSHAP Explainer   │
│  - SHAP Waterfall UI    │                      │  - Fraud Heuristics     │                      │  - Counterfactual Engine│
│  - Counterfactual Sim   │                      │  - Bedrock / Mock LLM   │                      └─────────────────────────┘
│  - Reviewer Dossier     │                      └───────────┬─────────────┘
└─────────────────────────┘                                  │
                                                             ▼
                                                 ┌─────────────────────────┐
                                                 │   PostgreSQL 16 DB      │
                                                 │  - applications         │
                                                 │  - audit_log (append)   │
                                                 │  - applicant_accounts   │
                                                 │  - otp_codes            │
                                                 │  - pgvector embeddings  │
                                                 └─────────────────────────┘
```

---

## 2. Request Lifecycle: Application Submission

```
1. Applicant fills application form (demographics, traditional credit fields, alternative behavioral data, free-text narrative).
2. Frontend sends POST /api/applications with Applicant JWT.
3. Express Gateway:
   a. Validates schema using Zod.
   b. Extracts/creates Applicant Account row.
   c. Executes Bias Guardrail: strips protected-attribute terms (gender, religion, caste, disability, marital status) via regex wordlists.
   d. Runs Fraud Signal Detection (velocity, duplicate narrative text, suspicious round numbers, maxed boundaries, narrative-income contradictions).
   e. Calls Model Service POST /score:
      - Validates schema with Pydantic.
      - XGBoost computes Probability of Default (PD) and Risk Tier (Approve / Manual Review / Reject).
      - TreeSHAP computes per-feature signed SHAP values.
   f. Generates natural language explanation via BedrockProvider or MockProvider using prompt template + SHAP values.
   g. Generates 1536-dimensional narrative embedding and queries pgvector for semantic cohort similarity.
   h. Inserts record into `applications` and an immutable, append-only row into `audit_log`.
   i. Triggers async email notification (decision email to applicant, new case alert to reviewer).
4. Returns application ID, risk tier, probability of default, SHAP top factors, and cohort to React UI.
5. UI renders interactive decision banner, SHAP bars, counterfactual explorer, and exportable PDF dossier.
```

---

## 3. Database Schema Design (PostgreSQL 16 + pgvector)

- **`applicant_accounts`**: Stores verified email identities (`id`, `email`, `name`, `created_at`, `last_login_at`).
- **`otp_codes`**: Immutable verification attempt log (`id`, `email`, `code`, `created_at`, `expires_at`, `verified_at`, `attempts`).
- **`applications`**: Underwriting dossiers (`id`, `created_at`, `applicant_id`, `features` JSONB, `transaction_narrative`, `probability_of_default`, `risk_tier`, `explanation`, `top_contributing_features` JSONB, `fraud_flags` TEXT[], `reviewer_decision`, `reviewer_decided_at`, `reviewer_username`).
- **`audit_log`**: Immutable compliance trail (`id`, `application_id`, `probability_of_default`, `risk_tier`, `explanation`, `shap_values` JSONB, `llm_provider`, `llm_model_id`, `guardrail_redactions_made`).
- **`embeddings`**: High-dimensional vector store (`id`, `application_id`, `embedding VECTOR(1536)` indexed via `ivfflat` cosine similarity).

---

## 4. Key Architectural Principles

1. **Deterministic Scoring vs. Generative Explanation**:
   The LLM **never** determines the credit score or risk tier. The score is computed by the deterministic XGBoost model; the LLM only translates SHAP values into natural language explanations.
2. **Dual-Secret Role Isolation**:
   Applicant tokens (`APPLICANT_JWT_SECRET`) and Reviewer tokens (`JWT_SECRET`) are signed with distinct cryptographic secrets and validated with role checks to eliminate privilege escalation.
3. **Independent Fraud vs. Credit Evaluation**:
   Fraud signals are heuristic flags surfaced for human reviewer inspection; they never silently alter the applicant's credit score.
4. **Mock-First & Swappable Providers**:
   Both the LLM service (`MockProvider` vs `BedrockProvider`) and OTP service (`MockEmailOtpProvider` vs `SmtpEmailOtpProvider`) support seamless offline demonstration with zero external API dependencies.
