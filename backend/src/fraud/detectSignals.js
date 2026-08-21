/**
 * Lightweight, rule-based fraud signals -- heuristics that flag an
 * application for reviewer attention without altering the score or risk
 * tier. The scoring model and these flags are computed independently by
 * design: a flagged application can still be scored and shown to the
 * applicant, and a reviewer decides what to do with the flag.
 *
 * Not a replacement for real fraud infrastructure (device fingerprinting,
 * velocity limits, anomaly detection) -- a defensible starting signal for
 * a prototype's timeline, addressing the "mitigating fraud" requirement
 * with something real rather than leaving it unaddressed.
 *
 * All checks here only pattern-match on applicant-reported data -- none
 * verifies anything against an external source. A production version's
 * highest-value addition would be PAN-based identity verification (via a
 * licensed credit bureau API -- CIBIL/Experian/Equifax/CRIF High Mark -- or
 * a KYC provider such as Karza/Signzy) to confirm the applicant is a real,
 * uniquely identified person before scoring, and to cross-check self-
 * reported income/activity against any existing bureau record. Deliberately
 * NOT built here: it requires a licensed lender/NBFC relationship or a
 * formal bureau partnership plus KYC-compliant consent capture, none of
 * which a hackathon prototype can obtain -- and for the specific NTC/
 * thin-file population this project targets, a bureau lookup would often
 * return little or nothing anyway, which is the whole reason alternative
 * data matters here in the first place.
 *
 * Also deliberately NOT built: ML-based anomaly detection (e.g. an
 * Isolation Forest over the feature vector). This project has no labeled
 * fraud data -- nobody has actually defrauded this prototype -- so there's
 * nothing to train a supervised model on, and public "fraud" datasets
 * (card-transaction fraud, e-commerce fraud) are the wrong shape for
 * application-level fraud and don't transfer cleanly. An unsupervised
 * approach (flagging statistical outliers in the existing 150k-row
 * training set) is possible but needs real false-positive-rate validation
 * before it's demo-safe -- an under-tuned outlier detector would likely
 * flag legitimate NTC/thin-file applicants just for being unusual, which
 * directly undermines this project's own "expand access" premise. Left as
 * a named production roadmap item rather than shipped half-validated.
 */

const HIGH_ACTIVITY_THRESHOLD = 200; // gig_trip_volume
const NO_UTILITY_HISTORY = 0; // utility_payment_streak (months)
const LOW_RECHARGE_REGULARITY = 10; // recharge_regularity_score (0-100)

/**
 * Flags a high claimed activity volume with no corroborating financial
 * footprint elsewhere -- consistent with a fabricated or inflated
 * activity number submitted to game the score, since gig_trip_volume is
 * self-reported and not independently verified in this prototype.
 */
function checkImplausibleActivity(features) {
  const highActivity = features.gig_trip_volume > HIGH_ACTIVITY_THRESHOLD;
  const noOtherFootprint =
    features.utility_payment_streak === NO_UTILITY_HISTORY &&
    features.recharge_regularity_score < LOW_RECHARGE_REGULARITY;

  return highActivity && noOtherFootprint
    ? "implausible_activity_no_footprint"
    : null;
}

/**
 * Flags a transaction narrative that exactly matches one submitted
 * recently -- consistent with scripted/automated submissions rather than
 * distinct individual applicants. windowMinutes and matches are kept
 * small/simple; a production version would use fuzzy matching and a
 * longer window.
 */
async function checkDuplicateNarrative(pool, narrative, windowMinutes = 60) {
  if (!narrative) return null;

  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM applications
     WHERE transaction_narrative = $1
       AND created_at > now() - ($2 || ' minutes')::interval`,
    [narrative, windowMinutes]
  );

  return rows[0].count > 0 ? "duplicate_narrative_recent" : null;
}

// Fields checked for suspiciously round values. Genuine financial data
// tends to carry natural noise (income of 47,300, not a clean 50,000);
// real-valued fields hitting exact round numbers across several fields
// at once is more consistent with someone typing in plausible-sounding
// placeholders than reporting an actual figure.
const ROUND_NUMBER_FIELDS = [
  { key: "MonthlyIncome", roundedTo: 1000, skipIfZero: true },
  { key: "RevolvingUtilizationOfUnsecuredLines", roundedTo: 0.1, skipIfZero: true },
  { key: "DebtRatio", roundedTo: 0.1, skipIfZero: true },
];
const ROUND_NUMBER_FLAG_THRESHOLD = 3; // fields that must all be round to fire
const PERFECT_GIG_RATING = 5;

/**
 * Flags an applicant profile where multiple independent real-valued
 * fields are all suspiciously round at once (income an exact multiple of
 * 1000, utilization an exact multiple of 0.1, debt ratio an exact
 * multiple of 0.1, plus a perfect 5.0 gig rating) -- each is individually
 * unremarkable, but several landing on round numbers simultaneously is
 * a low-entropy pattern more consistent with fabricated placeholder data
 * than genuine reported figures.
 */
function checkRoundNumberCluster(features) {
  let roundCount = 0;

  for (const { key, roundedTo, skipIfZero } of ROUND_NUMBER_FIELDS) {
    const value = features[key];
    if (skipIfZero && value === 0) continue;
    const remainder = Math.abs(value % roundedTo);
    const isRound = remainder < 1e-9 || Math.abs(remainder - roundedTo) < 1e-9;
    if (isRound) roundCount += 1;
  }

  if (features.gig_rating === PERFECT_GIG_RATING) roundCount += 1;

  return roundCount >= ROUND_NUMBER_FLAG_THRESHOLD ? "suspiciously_round_figures" : null;
}

// Fields treated as "maxed toward the best-looking value" when computing
// how many best-case signals an applicant profile hits simultaneously.
const BEST_CASE_CHECKS = [
  (f) => f.utility_payment_streak >= 36,
  (f) => f.recharge_regularity_score >= 95,
  (f) => f.gig_rating >= 4.9,
  (f) => f["NumberOfTime30-59DaysPastDueNotWorse"] === 0,
  (f) => f["NumberOfTime60-89DaysPastDueNotWorse"] === 0,
  (f) => f.NumberOfTimes90DaysLate === 0,
  (f) => f.RevolvingUtilizationOfUnsecuredLines <= 0.05,
];
const BEST_CASE_FLAG_THRESHOLD = 6; // out of 7 checks

/**
 * Flags a profile maxing out nearly every "good" signal at once (longest
 * possible utility streak, near-perfect recharge regularity, top gig
 * rating, zero late payments across every bucket, near-zero utilization).
 * A real population has a mix of strong and weak signals; a profile that
 * is uniformly best-case across unrelated fields is statistically rarer
 * than it looks and is a pattern consistent with someone filling in
 * maximum values to game every input rather than reporting mixed, real
 * financial behavior.
 */
function checkAllBoundaryMaxed(features) {
  const hitCount = BEST_CASE_CHECKS.filter((check) => check(features)).length;
  return hitCount >= BEST_CASE_FLAG_THRESHOLD ? "all_signals_maxed" : null;
}

// Phrases suggesting little or no income, checked against a MonthlyIncome
// that directly contradicts them. Deliberately simple substring matching,
// not NLP -- a production version would need broader coverage and should
// weigh false positives (e.g. "no income yet, but my spouse...") before
// this ever gates a decision rather than just flagging for review.
const NO_INCOME_PHRASES = ["no income", "unemployed", "not currently earning", "no earnings", "don't have a job", "dont have a job"];
const NO_INCOME_CONTRADICTION_THRESHOLD = 20000;

/**
 * Flags a narrative describing little or no income while the submitted
 * MonthlyIncome figure is well above zero -- a direct self-contradiction
 * between the free-text description and the structured data used for
 * scoring, consistent with the applicant (or a script generating
 * applications) not keeping the two fields consistent.
 */
function checkNarrativeIncomeMismatch(features, narrative) {
  if (!narrative) return null;
  const lower = narrative.toLowerCase();
  const claimsNoIncome = NO_INCOME_PHRASES.some((phrase) => lower.includes(phrase));
  if (!claimsNoIncome) return null;

  return features.MonthlyIncome >= NO_INCOME_CONTRADICTION_THRESHOLD
    ? "narrative_income_mismatch"
    : null;
}

const VELOCITY_WINDOW_MINUTES = 60;
const VELOCITY_APPLICATION_THRESHOLD = 3;

/**
 * Flags an applicant account that has submitted several applications in
 * a short window -- consistent with someone resubmitting slightly
 * varied figures to see what gets approved, rather than a single
 * considered application. Keyed on the verified applicant account, not
 * IP/device (not available in this prototype), so it only fires for
 * repeat submissions under the same verified email.
 */
async function checkApplicationVelocity(pool, applicantId, windowMinutes = VELOCITY_WINDOW_MINUTES) {
  if (!applicantId) return null;

  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM applications
     WHERE applicant_id = $1
       AND created_at > now() - ($2 || ' minutes')::interval`,
    [applicantId, windowMinutes]
  );

  return rows[0].count >= VELOCITY_APPLICATION_THRESHOLD - 1 ? "high_application_velocity" : null;
}

/**
 * Runs all fraud signal checks and returns the flags that fired.
 * @returns {Promise<string[]>}
 */
export async function detectFraudSignals(pool, { features, narrative, applicantId }) {
  const flags = [
    checkImplausibleActivity(features),
    checkRoundNumberCluster(features),
    checkAllBoundaryMaxed(features),
    checkNarrativeIncomeMismatch(features, narrative),
  ];
  flags.push(await checkDuplicateNarrative(pool, narrative));
  flags.push(await checkApplicationVelocity(pool, applicantId));
  return flags.filter(Boolean);
}
