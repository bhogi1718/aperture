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

/**
 * Runs all fraud signal checks and returns the flags that fired.
 * @returns {Promise<string[]>}
 */
export async function detectFraudSignals(pool, { features, narrative }) {
  const flags = [checkImplausibleActivity(features)];
  flags.push(await checkDuplicateNarrative(pool, narrative));
  return flags.filter(Boolean);
}
