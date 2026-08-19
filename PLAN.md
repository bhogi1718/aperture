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

## Build order (2 days)

### Day 1 — data + scoring core (the part that's actually judged)
1. Download Kaggle "Give Me Some Credit" CSV → `data/raw/cs-training.csv`
2. `model-service/training/` — Faker script to synthesize alt-data columns (utility payment streak, recharge regularity, gig trip volume/rating), loosely correlated with target
3. `model-service/training/train.py` — train XGBoost/LightGBM on structured + alt features, save model artifact + feature list
4. `model-service/app/` — FastAPI `/score` (predict + SHAP) and `/counterfactual` (perturb one feature, re-predict)
5. `model-service/tests/` — unit tests on scoring logic (deterministic inputs → expected tier boundaries)
6. Docker Compose: Postgres + pgvector, `backend/src/db/migrations` — applications table, audit_log table, embeddings table
7. `backend/src/services/` — LLMProvider interface, MockProvider (default), BedrockProvider (real SDK calls, env-gated)
8. `backend/src/guardrails/` — protected-attribute stripping (regex/wordlist pass before any prompt hits Bedrock/Mock)
9. Prompt template for SHAP → plain-English explanation

**End of Day 1 target:** `curl POST /api/applications` returns a real score, real SHAP-derived explanation (mocked LLM text is fine), and writes an audit row. This is the core deliverable — everything else is presentation on top of it.

### Day 2 — API surface, frontend, auth, polish
10. `backend/src/routes/` — applications (create/list/get), auth (login)
11. Auth: bcrypt-hashed reviewer credentials in `.env`, JWT middleware on dashboard routes
12. pgvector cohort comparison — embed narrative, `ORDER BY embedding <-> $1 LIMIT 5`
13. `frontend/` — applicant form → results page (score, explanation, feature chart, cohort, counterfactual)
14. `frontend/` — reviewer login → dashboard (list + detail, reusing results component)
15. Counterfactual UI hookup (stretch — cut first if behind schedule)
16. README (setup/run instructions), architecture diagram (docs/diagrams), backfill unit tests, final commit hygiene
17. PPT/PDF deck + submission folder named `SE23UCSE240.*`

**Cut order if time runs short:** counterfactual UI → dashboard filters/search → live Bedrock wiring (mock stays default) → polish/animations. Never cut: guardrails, audit logging, tests, README.

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
