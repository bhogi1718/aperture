import { buildExplanationPrompt } from "./explanationPrompt.js";

const FEATURE_LABELS = {
  RevolvingUtilizationOfUnsecuredLines: "credit utilization",
  age: "applicant age",
  "NumberOfTime30-59DaysPastDueNotWorse": "recent late payments",
  DebtRatio: "debt-to-income ratio",
  MonthlyIncome: "monthly income",
  NumberOfOpenCreditLinesAndLoans: "number of open credit lines",
  NumberOfTimes90DaysLate: "severe late payments",
  NumberRealEstateLoansOrLines: "real estate loans",
  "NumberOfTime60-89DaysPastDueNotWorse": "moderate late payments",
  NumberOfDependents: "number of dependents",
  income_was_missing: "income data availability",
  dependents_was_missing: "dependents data availability",
  utility_payment_streak: "utility payment streak",
  recharge_regularity_score: "mobile recharge regularity",
  gig_trip_volume: "income activity volume",
  gig_rating: "platform or client rating",
};

/**
 * Deterministic, template-based provider used as the default so local dev
 * and demos never depend on network access or AWS credentials. Uses the
 * same prompt-construction logic as BedrockProvider (via buildExplanationPrompt)
 * so the two providers stay behaviorally aligned even though this one doesn't
 * actually call an LLM.
 * @implements {import("./LLMProvider.js").LLMProvider}
 */
export class MockProvider {
  name = "mock";

  async generateExplanation({ probability, riskTier, topFeatures }) {
    // Constructing the prompt (even though we don't send it anywhere) keeps
    // this provider exercising the same guardrail-fed input path as Bedrock,
    // useful for demoing/inspecting exactly what would be sent.
    buildExplanationPrompt({ probability, riskTier, topFeatures });

    const top = topFeatures.slice(0, 3).map((f) => {
      const label = FEATURE_LABELS[f.feature] ?? f.feature;
      const direction = f.shap_value > 0 ? "raised" : "lowered";
      return `${label} (${direction} the risk)`;
    });

    const pct = (probability * 100).toFixed(1);
    const sentence =
      top.length >= 2
        ? `${top.slice(0, -1).join(", ")} and ${top[top.length - 1]}`
        : top[0] ?? "the factors reviewed";

    const explanation =
      `This application was assessed as "${riskTier}" with an estimated default ` +
      `probability of ${pct}%. The most influential factors were ${sentence}. ` +
      `This assessment is based on financial history and payment behavior only.`;

    return { explanation, modelId: null };
  }

  async embed(text) {
    // Deterministic pseudo-embedding derived from the text so identical/similar
    // narratives produce identical/similar vectors in local dev, without
    // calling an external embedding model. Not semantically meaningful --
    // only good enough to exercise the pgvector query path end-to-end.
    const dimensions = 1536;
    const embedding = new Array(dimensions).fill(0);
    for (let i = 0; i < text.length; i++) {
      embedding[i % dimensions] += text.charCodeAt(i) / 255;
    }
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0)) || 1;
    return { embedding: embedding.map((v) => v / norm), modelId: null };
  }
}
