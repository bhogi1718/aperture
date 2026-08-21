import { test } from "node:test";
import assert from "node:assert/strict";
import { detectFraudSignals } from "../src/fraud/detectSignals.js";

// Baseline "clean" applicant -- passes every check, used as the starting
// point each test mutates from so each test isolates one signal.
const baseFeatures = {
  RevolvingUtilizationOfUnsecuredLines: 0.34,
  age: 34,
  "NumberOfTime30-59DaysPastDueNotWorse": 1,
  DebtRatio: 0.27,
  MonthlyIncome: 47300,
  NumberOfOpenCreditLinesAndLoans: 3,
  NumberOfTimes90DaysLate: 0,
  NumberRealEstateLoansOrLines: 1,
  "NumberOfTime60-89DaysPastDueNotWorse": 0,
  NumberOfDependents: 1,
  income_was_missing: 0,
  dependents_was_missing: 0,
  utility_payment_streak: 18,
  recharge_regularity_score: 62,
  gig_trip_volume: 40,
  gig_rating: 4.3,
};

// pool.query is called by the duplicate-narrative and velocity checks;
// a no-match stub keeps those two checks silent so each test can isolate
// the pure feature/narrative-based signal it's exercising.
const noMatchPool = { query: async () => ({ rows: [{ count: 0 }] }) };

test("clean applicant profile triggers no flags", async () => {
  const flags = await detectFraudSignals(noMatchPool, { features: baseFeatures, narrative: null, applicantId: "a1" });
  assert.deepEqual(flags, []);
});

test("flags implausible activity with no financial footprint", async () => {
  const features = { ...baseFeatures, gig_trip_volume: 250, utility_payment_streak: 0, recharge_regularity_score: 5 };
  const flags = await detectFraudSignals(noMatchPool, { features, narrative: null, applicantId: "a1" });
  assert.ok(flags.includes("implausible_activity_no_footprint"));
});

test("does not flag high activity when other footprint exists", async () => {
  const features = { ...baseFeatures, gig_trip_volume: 250, utility_payment_streak: 12, recharge_regularity_score: 60 };
  const flags = await detectFraudSignals(noMatchPool, { features, narrative: null, applicantId: "a1" });
  assert.ok(!flags.includes("implausible_activity_no_footprint"));
});

test("flags a cluster of suspiciously round figures", async () => {
  const features = {
    ...baseFeatures,
    MonthlyIncome: 50000,
    RevolvingUtilizationOfUnsecuredLines: 0.3,
    DebtRatio: 0.2,
    gig_rating: 5,
  };
  const flags = await detectFraudSignals(noMatchPool, { features, narrative: null, applicantId: "a1" });
  assert.ok(flags.includes("suspiciously_round_figures"));
});

test("does not flag a single round field alone", async () => {
  const features = { ...baseFeatures, MonthlyIncome: 50000 };
  const flags = await detectFraudSignals(noMatchPool, { features, narrative: null, applicantId: "a1" });
  assert.ok(!flags.includes("suspiciously_round_figures"));
});

test("flags a profile with nearly every signal maxed", async () => {
  const features = {
    ...baseFeatures,
    utility_payment_streak: 36,
    recharge_regularity_score: 100,
    gig_rating: 5,
    "NumberOfTime30-59DaysPastDueNotWorse": 0,
    "NumberOfTime60-89DaysPastDueNotWorse": 0,
    NumberOfTimes90DaysLate: 0,
    RevolvingUtilizationOfUnsecuredLines: 0.02,
  };
  const flags = await detectFraudSignals(noMatchPool, { features, narrative: null, applicantId: "a1" });
  assert.ok(flags.includes("all_signals_maxed"));
});

test("does not flag a realistic mixed profile", async () => {
  const flags = await detectFraudSignals(noMatchPool, { features: baseFeatures, narrative: null, applicantId: "a1" });
  assert.ok(!flags.includes("all_signals_maxed"));
});

test("flags narrative claiming no income against a high MonthlyIncome", async () => {
  const features = { ...baseFeatures, MonthlyIncome: 60000 };
  const flags = await detectFraudSignals(noMatchPool, {
    features,
    narrative: "I am currently unemployed and have no income.",
    applicantId: "a1",
  });
  assert.ok(flags.includes("narrative_income_mismatch"));
});

test("does not flag no-income narrative when income is genuinely low", async () => {
  const features = { ...baseFeatures, MonthlyIncome: 0 };
  const flags = await detectFraudSignals(noMatchPool, {
    features,
    narrative: "I am currently unemployed and have no income.",
    applicantId: "a1",
  });
  assert.ok(!flags.includes("narrative_income_mismatch"));
});

test("flags duplicate narrative text submitted recently", async () => {
  const matchPool = { query: async () => ({ rows: [{ count: 1 }] }) };
  const flags = await detectFraudSignals(matchPool, {
    features: baseFeatures,
    narrative: "I run a small tailoring shop.",
    applicantId: "a1",
  });
  assert.ok(flags.includes("duplicate_narrative_recent"));
});

test("flags high application velocity for a repeat applicant", async () => {
  const matchPool = { query: async () => ({ rows: [{ count: 2 }] }) };
  const flags = await detectFraudSignals(matchPool, { features: baseFeatures, narrative: null, applicantId: "a1" });
  assert.ok(flags.includes("high_application_velocity"));
});

test("does not check velocity when applicantId is missing", async () => {
  let queried = false;
  const trackingPool = {
    query: async (sql) => {
      if (sql.includes("applicant_id")) queried = true;
      return { rows: [{ count: 0 }] };
    },
  };
  await detectFraudSignals(trackingPool, { features: baseFeatures, narrative: null, applicantId: null });
  assert.equal(queried, false);
});
