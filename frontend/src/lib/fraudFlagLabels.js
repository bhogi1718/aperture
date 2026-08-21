// Single source of truth for fraud-flag copy, shown to reviewers on both
// the dashboard (short form, as a badge tooltip) and the detail page
// (long form, as a full description). Keys must match the flag strings
// returned by backend/src/fraud/detectSignals.js exactly.
export const FRAUD_FLAG_LABELS = {
  implausible_activity_no_footprint: 'High claimed activity volume with no other financial footprint (utility payments or recharge regularity).',
  duplicate_narrative_recent: 'This narrative text matches another application submitted in the last hour.',
  suspiciously_round_figures: 'Several submitted figures are suspiciously round, more consistent with placeholder data than real reported values.',
  all_signals_maxed: 'Nearly every factor is at its best possible value at once, an unusually uniform profile.',
  narrative_income_mismatch: 'The narrative describes little or no income, but the submitted monthly income is well above zero.',
  high_application_velocity: 'This applicant has submitted several applications in a short window.',
};
