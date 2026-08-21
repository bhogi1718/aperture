# Aperture — Real-Time, Multi-Modal Underwriting Engine

Built for the Synchrony "Next-Gen Credit Intelligence" hackathon (roll no. **SE23UCSE240**).

Aperture is a credit-decisioning prototype for **New-to-Credit (NTC) and thin-file
applicants** — people traditional bureau-only scoring underserves because they
have little or no credit history. It combines a standard bureau-style feature
set with alternative behavioral data (utility payment streak, mobile recharge
regularity, gig/freelance activity and rating) to produce a real-time decision
with a plain-English explanation, a counterfactual ("what would change this
decision"), rule-based fraud signals, and a full audit trail — while actively
stripping protected-attribute language from free-text input before it reaches
any model or storage.

**A hardcoded score never comes from the LLM.** XGBoost produces the
probability of default and risk tier; the LLM layer only explains that
decision (via SHAP feature contributions) and powers cohort comparison. This
separation is deliberate — it's what makes the decision auditable.

## What it does

1. An applicant creates an account via **email + OTP verification** (no
   password to manage) and fills out a single-page form covering both
   traditional credit factors and alternative data.
2. The backend strips any protected-attribute language (gender, religion,
   caste, disability, marital status) from free-text before it goes anywhere
   near a prompt or the database.
3. The model service scores the applicant with **XGBoost**, returns a
   probability of default, a risk tier (**Approve / Manual Review / Reject**,
   thresholds derived empirically from the validation score distribution —
   not hardcoded guesses), and **SHAP** per-feature contributions.
4. Rule-based fraud heuristics run independently of the score (implausible
   activity with no financial footprint, duplicate narrative text within a
   time window) and surface as flags for reviewers — they never change the
   applicant's score or tier themselves.
5. An LLM layer (mock by default, swappable to AWS Bedrock) turns the SHAP
   values into a plain-English explanation and answers "what would change
   this decision" as an interactive counterfactual.
6. Every decision — inputs, score, tier, explanation, SHAP values, fraud
   flags, timestamp — is written to an audit log in Postgres.
7. Returning applicants (same email) see their past application history
   instead of a blank form.
8. A separate, JWT-gated reviewer dashboard lists all applications, flags,
   and full explanations for human review.

## Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   React     │ HTTP │  Express backend │ HTTP │  FastAPI model-  │
│  (Vite)     │─────▶│  (Node.js)       │─────▶│  service          │
│  :5173      │◀─────│  :4000           │◀─────│  :8000            │
└─────────────┘      └───────┬──────────┘      └──────────────────┘
                              │                    XGBoost + SHAP
                              │                    (probability, tier,
                              ▼                     feature contributions)
                     ┌──────────────────┐
                     │   PostgreSQL 16   │
                     │   + pgvector      │
                     │   :5432 (Docker)  │
                     └──────────────────┘
                     applications, audit log,
                     applicant accounts, OTP codes,
                     narrative embeddings (cohort search)

                     LLM layer (backend-internal, swappable):
                     MockProvider (default, zero external calls)
                     BedrockProvider (real, env-gated) — explanation
                     text generation + narrative embeddings only.
                     Never produces the score.
```

See [docs/architecture.md](docs/architecture.md) for the full request-flow
diagram, data flow, and design rationale.

### Request flow (application submission)

```
React → Express POST /api/applications  (requires applicant JWT)
          → guardrails: strip protected-attribute language from narrative
          → fraud signal checks (implausible activity, duplicate narrative)
          → FastAPI POST /score → XGBoost prediction + SHAP values
          → LLM provider: SHAP values + template → plain-English explanation
          → LLM provider: narrative → embedding → pgvector similarity search
          → Postgres: insert audit row (inputs, score, tier, explanation,
            SHAP values, fraud flags, timestamp)
          ← score, tier, explanation, top features, fraud flags, cohort
React ← renders Results page (score, explanation, counterfactual explorer)
```

### Auth model

Two independent JWT-gated identities, deliberately signed with **different
secrets** and carrying a `role` claim that both auth middlewares verify — so
a token minted for one role is rejected on the other's routes even if the
secrets were ever misconfigured to match:

- **Applicant sessions** — issued after email OTP verification
  (`APPLICANT_JWT_SECRET`), required to submit an application or view your
  own application history.
- **Reviewer sessions** — issued after username/password login
  (`JWT_SECRET`), required for the dashboard and any cross-applicant data.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite, React Router |
| Backend | Node.js + Express, Zod validation, JWT auth |
| Model service | Python + FastAPI, XGBoost, SHAP |
| Database | PostgreSQL 16 + pgvector (Docker Compose) |
| AI / LLM layer | Swappable provider interface — Mock (default) or AWS Bedrock |
| Email OTP | Swappable provider interface — Mock (default, console log) or SMTP |
| Auth | bcrypt (reviewer password) + JWT (dual secrets, role-scoped) |

The **mock-first, swappable-provider** pattern is used consistently for both
the LLM layer and email delivery: everything runs and is fully demoable with
zero external accounts or API keys, and flipping one env var swaps in the
real integration (AWS Bedrock, SMTP) without touching application code.

## Why XGBoost

Benchmarked against LightGBM, Random Forest, and Logistic Regression via
5-fold cross-validated grid search (`model-service/training/compare_models.py`,
results in `model-service/artifacts/model_comparison.json`), optimizing for
average precision given the dataset's ~93/7% class imbalance:

| Model | CV ROC AUC | CV Average Precision |
|---|---|---|
| **XGBoost (production)** | **0.9103** | 0.5453 |
| LightGBM | 0.9097 | 0.5455 |
| Random Forest | 0.9055 | 0.5283 |
| Logistic Regression (baseline) | 0.8823 | 0.4609 |

XGBoost and LightGBM are statistically tied on average precision; XGBoost
won on ROC AUC and trained ~34% faster, so it's the production model.
Final production metrics (full training split): **ROC AUC 0.9127, average
precision 0.5481**.

## Responsible AI

- **Guardrails**: regex-based stripping of protected-attribute language
  (gender, religion, caste, disability, marital status) from free-text
  narratives before they reach any LLM prompt or storage — verified with
  unit tests and a live redaction check.
- **Explainability**: every decision ships with SHAP-derived, per-feature
  contributions and a plain-English explanation, not just a number.
- **Transparency**: risk-tier thresholds are derived empirically from the
  validation score distribution (documented in
  `model-service/artifacts/risk_tiers.json`), not arbitrary cutoffs.
- **Auditability**: every score + explanation + fraud-flag combination is
  logged with its inputs and timestamp.
- **Fraud detection is separate from scoring**: fraud flags never alter an
  applicant's score or tier — they only surface for human reviewer
  attention, keeping the credit decision and the fraud signal independently
  inspectable.
- **Known limitation, documented not hidden**: current fraud checks
  pattern-match only on self-reported data; they don't verify identity
  against an external source. See the module docstring in
  `backend/src/fraud/detectSignals.js` for why PAN-based bureau
  verification is the right production next step and why it wasn't built
  for this prototype (licensing/partnership requirements, and tension with
  the NTC/thin-file premise itself).

## Getting started

### Prerequisites
- Node.js 20+
- Python 3.12+
- Docker Desktop (for Postgres + pgvector)

### 1. Clone and install
```bash
git clone <repo-url>
cd Aperture
npm install                                  # root + frontend + backend workspaces
cd model-service && python -m venv .venv
./.venv/Scripts/activate                      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 2. Start Postgres
```bash
npm run db:up          # docker compose up -d
npm run db:migrate      # runs backend/src/db/migrations/*.sql in order
```

### 3. Configure environment
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env` — the defaults (`LLM_PROVIDER=mock`,
`EMAIL_OTP_PROVIDER=mock`) require **no external accounts** and are fully
demoable out of the box. `JWT_SECRET` and `APPLICANT_JWT_SECRET` must be set
to distinct random strings (the app refuses to start otherwise). Generate a
reviewer password hash with:
```bash
npm run hash:reviewer-password --workspace=backend -- <your-password>
```

### 4. Model artifacts — already included, no training required
`model-service/artifacts/` (the trained model, feature list, risk-tier
thresholds, and model-comparison results) is committed to this repo, so the
app runs immediately after cloning — no dataset download or training step
needed to see it work end to end. Skip to step 5 unless you specifically
want to retrain.

#### Retraining from scratch (optional)
The training data itself is **not** included — it's built from Kaggle's
["Give Me Some Credit"](https://www.kaggle.com/c/GiveMeSomeCredit/data)
competition dataset, which its license doesn't permit redistributing.
To retrain:
1. Create a free Kaggle account, accept the competition rules, and download
   `cs-training.csv` from the link above (the "Data" tab).
2. Place it at `data/raw/cs-training.csv`.
3. From `model-service/`, build the combined training set (cleans the raw
   data and joins on synthetic alternative-data columns — utility payment
   streak, mobile recharge regularity, gig activity — loosely correlated
   with the real outcome):
   ```bash
   cd model-service
   ./.venv/Scripts/python.exe training/build_dataset.py
   ```
   This writes `data/processed/aperture_training.csv` (repo-root-relative,
   so it works regardless of where the script is invoked from).
4. Train:
   ```bash
   ./.venv/Scripts/python.exe training/train.py
   ```
   This overwrites `model-service/artifacts/model.joblib` and the
   accompanying metrics/threshold files.

### 5. Run all three services
```bash
# Terminal 1
cd model-service && ./.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000

# Terminal 2
npm run dev:backend      # :4000

# Terminal 3
npm run dev:frontend      # :5173
```

Open **http://localhost:5173**.

### Demo login
- **Applicant**: any email — with `EMAIL_OTP_PROVIDER=mock` (default), the
  verification code is shown directly in the UI response (`devCode`), no
  real email needed.
- **Reviewer**: username `reviewer`, password set via the hash command
  above.

## Testing

```bash
# Backend — 17 tests: OTP schemas, guardrail redaction, mock provider
cd backend && npm test

# Model service — 10 tests: scoring determinism, SHAP contributions,
# risk-tier boundaries, counterfactual logic
cd model-service && ./.venv/Scripts/python.exe -m pytest
```

## Project structure

```
frontend/        React app — applicant flow (verify → apply → results),
                  reviewer flow (login → dashboard → detail)
backend/          Express API — auth, guardrails, fraud detection,
                  LLM + email-OTP provider abstractions, Postgres access
model-service/    FastAPI — XGBoost training, /score, /counterfactual, SHAP
data/             Source dataset (Kaggle "Give Me Some Credit") + synthetic
                  alternative-data generator
docs/             Architecture diagram, design notes
submission/       Final deck + packaged submission (SE23UCSE240.*)
CHANGELOG.md      Dated build log — what was built, why, and what trade-offs
                  were made at each step
PLAN.md           Original phased build plan
```

## Data sources

- **Structured credit features**: Kaggle "Give Me Some Credit" (150,000
  rows) — age, income, utilization, delinquency history, open credit lines.
- **Alternative data**: synthetically generated (Faker) and loosely
  correlated with the real target variable — utility payment streak, mobile
  recharge regularity, gig/freelance trip volume and rating. Represents the
  kind of behavioral signal a real deployment would source from utility
  billers, telecom providers, or gig platforms via partnership APIs.
