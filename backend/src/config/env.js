import "dotenv/config";

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  reviewerUsername: process.env.REVIEWER_USERNAME ?? "reviewer",
  reviewerPasswordHash: process.env.REVIEWER_PASSWORD_HASH ?? "",
  llmProvider: process.env.LLM_PROVIDER ?? "mock",
  awsRegion: process.env.AWS_REGION ?? "ap-south-1",
  bedrockExplanationModelId: process.env.BEDROCK_EXPLANATION_MODEL_ID ?? "",
  bedrockEmbeddingModelId: process.env.BEDROCK_EMBEDDING_MODEL_ID ?? "",
  modelServiceUrl: process.env.MODEL_SERVICE_URL ?? "http://localhost:8000",
};
