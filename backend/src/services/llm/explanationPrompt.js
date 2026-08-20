export const FEATURE_LABELS = {
  RevolvingUtilizationOfUnsecuredLines: "credit utilization",
  age: "applicant age",
  "NumberOfTime30-59DaysPastDueNotWorse": "30-59 day late payments",
  DebtRatio: "debt-to-income ratio",
  MonthlyIncome: "monthly income",
  NumberOfOpenCreditLinesAndLoans: "number of open credit lines",
  NumberOfTimes90DaysLate: "90+ day late payments",
  NumberRealEstateLoansOrLines: "real estate loans",
  "NumberOfTime60-89DaysPastDueNotWorse": "60-89 day late payments",
  NumberOfDependents: "number of dependents",
  income_was_missing: "income data availability",
  dependents_was_missing: "dependents data availability",
  utility_payment_streak: "utility payment streak",
  recharge_regularity_score: "mobile recharge regularity",
  gig_trip_volume: "income activity volume",
  gig_rating: "platform or client rating",
};

function describeFeature(contribution) {
  const label = FEATURE_LABELS[contribution.feature] ?? contribution.feature;
  const direction = contribution.shap_value > 0 ? "increased" : "decreased";
  return `- ${label} (value: ${contribution.feature_value}) ${direction} the risk score`;
}

export function buildExplanationPrompt({ probability, riskTier, topFeatures }) {
  const featureLines = topFeatures.map(describeFeature).join("\n");

  return `You are explaining a credit risk decision to an applicant in plain, respectful English. Do not mention race, gender, religion, caste, disability, or marital status even if referenced elsewhere -- base the explanation only on the financial and behavioral factors below.

Decision: ${riskTier} (estimated default probability: ${(probability * 100).toFixed(1)}%)

Top contributing factors, in order of importance:
${featureLines}

Write a 3-4 sentence explanation of this decision for the applicant, citing the top 2-3 factors by name. Be factual and neutral in tone. Do not use the words "algorithm" or "model" -- write as if explaining a financial assessment.`;
}
