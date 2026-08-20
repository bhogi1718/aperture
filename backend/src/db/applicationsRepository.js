import { pool } from "./pool.js";

export async function insertApplication({
  features,
  transactionNarrative,
  probabilityOfDefault,
  riskTier,
  explanation,
  topContributingFeatures,
  fraudFlags = [],
}) {
  const { rows } = await pool.query(
    `INSERT INTO applications
       (features, transaction_narrative, probability_of_default, risk_tier, explanation, top_contributing_features, fraud_flags)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, created_at`,
    [
      JSON.stringify(features),
      transactionNarrative ?? null,
      probabilityOfDefault,
      riskTier,
      explanation,
      JSON.stringify(topContributingFeatures),
      fraudFlags,
    ]
  );
  return rows[0];
}

export async function insertAuditLogEntry({
  applicationId,
  probabilityOfDefault,
  riskTier,
  explanation,
  shapValues,
  llmProvider,
  llmModelId,
  guardrailRedactionsMade,
}) {
  await pool.query(
    `INSERT INTO audit_log
       (application_id, probability_of_default, risk_tier, explanation, shap_values, llm_provider, llm_model_id, guardrail_redactions_made)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      applicationId,
      probabilityOfDefault,
      riskTier,
      explanation,
      JSON.stringify(shapValues),
      llmProvider,
      llmModelId,
      guardrailRedactionsMade,
    ]
  );
}

export async function insertEmbedding(applicationId, embedding) {
  await pool.query(
    `INSERT INTO embeddings (application_id, embedding) VALUES ($1, $2)`,
    [applicationId, `[${embedding.join(",")}]`]
  );
}

export async function findSimilarApplications(applicationId, limit = 5) {
  const { rows } = await pool.query(
    `SELECT a.id, a.created_at, a.risk_tier, a.probability_of_default,
            e.embedding <-> (SELECT embedding FROM embeddings WHERE application_id = $1) AS distance
     FROM applications a
     JOIN embeddings e ON e.application_id = a.id
     WHERE a.id != $1
     ORDER BY distance ASC
     LIMIT $2`,
    [applicationId, limit]
  );
  return rows;
}

export async function listApplications({ limit = 50, offset = 0 } = {}) {
  const { rows } = await pool.query(
    `SELECT id, created_at, risk_tier, probability_of_default, explanation, fraud_flags
     FROM applications
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

export async function getApplicationById(id) {
  const { rows } = await pool.query(
    `SELECT id, created_at, features, transaction_narrative, probability_of_default,
            risk_tier, explanation, top_contributing_features, fraud_flags
     FROM applications
     WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}
