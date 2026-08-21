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

export function formatFeatureValue(key, value) {
  if (value === null || value === undefined) return '—';
  const num = Number(value);

  switch (key) {
    case 'MonthlyIncome':
      return `$${num.toLocaleString()}`;
    case 'RevolvingUtilizationOfUnsecuredLines':
      return `${(num * 100).toFixed(1)}%`;
    case 'DebtRatio':
      return `${(num * 100).toFixed(1)}%`;
    case 'utility_payment_streak':
      return `${num} month${num === 1 ? '' : 's'}`;
    case 'recharge_regularity_score':
      return `${num} / 100`;
    case 'gig_rating':
      return `${num.toFixed(1)} / 5.0`;
    case 'gig_trip_volume':
      return `${num} activities`;
    case 'age':
      return `${num} yrs`;
    case 'income_was_missing':
    case 'dependents_was_missing':
      return num === 1 ? 'Estimated' : 'Reported';
    default:
      return String(value);
  }
}

export const FEATURE_GROUPS = {
  profile: {
    title: 'Applicant Demographics',
    keys: ['age', 'NumberOfDependents'],
  },
  alternative: {
    title: 'Alternative Behavioral Signals (NTC)',
    keys: ['utility_payment_streak', 'recharge_regularity_score', 'gig_trip_volume', 'gig_rating'],
  },
  financial: {
    title: 'Financial & Bureau Footprint',
    keys: [
      'MonthlyIncome',
      'DebtRatio',
      'RevolvingUtilizationOfUnsecuredLines',
      'NumberOfOpenCreditLinesAndLoans',
      'NumberRealEstateLoansOrLines',
      'NumberOfTime30-59DaysPastDueNotWorse',
      'NumberOfTime60-89DaysPastDueNotWorse',
      'NumberOfTimes90DaysLate',
    ],
  },
};

