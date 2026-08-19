# Aperture — Build Plan

Synchrony "Next-Gen Credit Intelligence" hackathon. Deadline: **Fri 21 Aug 2026, 12:00 PM IST**.

## Architecture

```
frontend/        React (applicant form + underwriter dashboard, JWT-gated)
backend/          Express API — orchestration, auth, guardrails, Bedrock calls, Postgres access
model-service/    FastAPI — XGBoost/LightGBM training + inference + SHAP + counterfactual
data/             Kaggle CSV (gitignored) + synthetic alt-data generator output
docs/             architecture diagram, notes
submission/       final PPT/PDF + code zip, named SE23UCSE240.*
```

Request flow:
```
React → Express /api/applications (POST)
          → guardrails: strip protected-attribute language from free-text fields
          → FastAPI /score  → XGBoost prediction + SHAP values
          → Bedrock: SHAP values + template → plain-English explanation
          → Bedrock: transaction narrative → embedding → pgvector similarity search → cohort
          → Postgres: insert audit row (inputs, score, tier, explanation, SHAP, timestamp)
          ← score, tier, explanation, top features, cohort, (counterfactual if requested)
React ← renders results page

React → Express /api/auth/login → JWT
React → Express /api/applications (GET, JWT-gated) → underwriter dashboard list/detail
```

Key principle preserved throughout: **the LLM never produces the score.** XGBoost does. Bedrock only explains and embeds.

## Phased workflow

Each phase has an exit criterion — a concrete, checkable thing that must be true before moving on.

### Phase 0 — Setup ✅ done
Repo scaffolded, git initialized, GitHub remote connected (`bhogi1718/aperture`), Kaggle dataset in `data/raw/`.

### Phase 1 — Data layer ✅ done
- Explore the real dataset (columns, distributions, missing values) via the Data Dictionary
- Build the Faker-based synthetic alt-data generator (utility payment streak, recharge regularity, gig trip volume/rating) joined onto each row, loosely correlated with `SeriousDlqin2yrs`
- Output: one combined training CSV (structured + alt-data) in `data/processed/`
- **Exit criteria:** a single clean dataframe/CSV ready for training, with a short data-quality sanity check (row counts, no leakage, correlation sanity)

### Phase 2 — Scoring model (model-service) ✅ done
- Train XGBoost/LightGBM on the combined dataset
- Wrap it in FastAPI: `/score` (predict + SHAP values), `/counterfactual` (perturb one feature, re-predict)
- Unit tests on scoring logic (deterministic inputs → expected tier)
- **Exit criteria:** `curl localhost:8000/score` returns a probability, risk tier, and SHAP feature contributions for a sample applicant

### Phase 3 — Backend core (Express + Postgres) ✅ done
- Docker Compose: Postgres + pgvector
- DB migrations: `applications`, `audit_log`, `embeddings` tables
- Guardrails module: strip protected-attribute language before any text reaches an LLM prompt
- `LLMProvider` interface + `MockProvider` (default) + `BedrockProvider` (real, env-gated)
- Explanation prompt template: SHAP values → plain-English text
- Wire together: `POST /api/applications` → guardrails → model-service → LLM explanation → audit log insert
- **Exit criteria:** one end-to-end `curl POST /api/applications` returns score + explanation + writes an audit row. This is the core deliverable — everything after this is presentation on top of a working engine.

### Phase 4 — Cohort comparison (pgvector) ✅ done
- Embed applicant transaction narrative (via provider)
- Similarity search against past applicants in Postgres
- Wire cohort results into the application response
- **Exit criteria:** response includes N similar past applicants with their outcomes
- Built alongside Phase 3 — the applications route needed it to be complete end-to-end

### Phase 5 — Auth + API surface ✅ done
- Reviewer login (bcryptjs + JWT), auth middleware on dashboard routes
- Full route set: create/list/get applications, login
- **Exit criteria:** protected routes reject requests without a valid JWT; login issues one
- Built alongside Phase 3 — the dashboard routes needed auth to be complete end-to-end

### Phase 6 — Frontend ✅ done
- Applicant form → results page (score, explanation, feature chart, cohort, counterfactual)
- Reviewer login → dashboard (list + detail view, reusing the results component)
- **Exit criteria:** full click-through demo works in a browser, no manual API calls needed
- Verified with a real headless-browser run against the live backend + model-service (screenshots, zero console errors) — not just visual inspection

### Phase 7 — Stretch: counterfactual UI ✅ done
- Hook up `/counterfactual` to a UI control ("what if X improved by 15%?")
- Built alongside Phase 6 — it lives on the Results page, so it went in with the rest of that screen rather than as a separate pass

### Phase 8 — Wrap-up & submission ← current
- README (setup/run instructions)
- Architecture diagram
- Backfill any missing unit tests
- Final commit hygiene
- PPT/PDF deck: approach, key insights, findings, proposed solution
- Package into `submission/` named `SE23UCSE240.*`

**Cut order if time runs short:** Phase 7 → dashboard filters/search polish → live Bedrock wiring (mock stays default, fine to demo with) → visual polish. **Never cut:** guardrails, audit logging, tests, README.

**Rough day mapping:** Phases 1-3 → Day 1 (data + scoring core is what's actually judged). Phases 4-8 → Day 2 (API surface, frontend, auth, polish, submission).

## Services

| Service | Port | Stack |
|---|---|---|
| frontend | 3000 | React |
| backend | 4000 | Express, JWT auth |
| model-service | 8000 | FastAPI, XGBoost/LightGBM, SHAP |
| postgres | 5432 | Postgres 16 + pgvector (Docker) |

## Open items to confirm as we go
- Exact risk-tier thresholds (Approve / Manual Review / Reject) — derive from score distribution once model is trained
- Bedrock model IDs for explanation (Claude, Haiku-tier) and embeddings (Titan/Cohere) — finalize when/if live credentials are wired in
