// Mirrors backend/src/services/llm/explanationPrompt.js so the UI and the
// LLM-generated explanation refer to factors using the same plain-English names.
export const FEATURE_LABELS = {
  RevolvingUtilizationOfUnsecuredLines: 'Credit utilization',
  age: 'Applicant age',
  'NumberOfTime30-59DaysPastDueNotWorse': '30-59 day late payments',
  DebtRatio: 'Debt-to-income ratio',
  MonthlyIncome: 'Monthly income',
  NumberOfOpenCreditLinesAndLoans: 'Open credit lines',
  NumberOfTimes90DaysLate: '90+ day late payments',
  NumberRealEstateLoansOrLines: 'Real estate loans',
  'NumberOfTime60-89DaysPastDueNotWorse': '60-89 day late payments',
  NumberOfDependents: 'Number of dependents',
  income_was_missing: 'Income data availability',
  dependents_was_missing: 'Dependents data availability',
  utility_payment_streak: 'Utility payment streak',
  recharge_regularity_score: 'Mobile recharge regularity',
  gig_trip_volume: 'Income activity volume',
  gig_rating: 'Platform or client rating',
};

export function featureLabel(key) {
  return FEATURE_LABELS[key] ?? key;
}
