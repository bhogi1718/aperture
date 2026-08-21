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

  // OTP / applicant identity
  emailOtpProvider: process.env.EMAIL_OTP_PROVIDER ?? "mock",
  applicantJwtSecret: required("APPLICANT_JWT_SECRET"),
  nodeEnv: process.env.NODE_ENV ?? "development",

  // Only required when EMAIL_OTP_PROVIDER=smtp
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPassword: process.env.SMTP_PASSWORD ?? "",
  smtpFromAddress: process.env.SMTP_FROM_ADDRESS ?? "",
};
