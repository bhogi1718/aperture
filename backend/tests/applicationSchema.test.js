import { test } from "node:test";
import assert from "node:assert/strict";
import { createApplicationSchema, reviewerDecisionSchema } from "../src/schemas/applicationSchema.js";

const validApplicant = {
  RevolvingUtilizationOfUnsecuredLines: 0.3,
  age: 34,
  "NumberOfTime30-59DaysPastDueNotWorse": 0,
  DebtRatio: 0.2,
  MonthlyIncome: 45000,
  NumberOfOpenCreditLinesAndLoans: 3,
  NumberOfTimes90DaysLate: 0,
  NumberRealEstateLoansOrLines: 1,
  "NumberOfTime60-89DaysPastDueNotWorse": 0,
  NumberOfDependents: 0,
  income_was_missing: 0,
  dependents_was_missing: 0,
  utility_payment_streak: 12,
  recharge_regularity_score: 50,
  gig_trip_volume: 20,
  gig_rating: 4.5,
};

test("createApplicationSchema accepts a request with no applicantName (returning applicant)", () => {
  const result = createApplicationSchema.safeParse({ applicant: validApplicant });
  assert.equal(result.success, true);
  assert.equal(result.data.applicantName, undefined);
});

test("createApplicationSchema accepts a valid applicantName", () => {
  const result = createApplicationSchema.safeParse({ applicant: validApplicant, applicantName: "Priya Sharma" });
  assert.equal(result.success, true);
  assert.equal(result.data.applicantName, "Priya Sharma");
});

test("createApplicationSchema rejects an applicantName over 100 characters", () => {
  const result = createApplicationSchema.safeParse({ applicant: validApplicant, applicantName: "a".repeat(101) });
  assert.equal(result.success, false);
});

test("reviewerDecisionSchema accepts Approved or Rejected", () => {
  assert.equal(reviewerDecisionSchema.safeParse({ decision: "Approved" }).success, true);
  assert.equal(reviewerDecisionSchema.safeParse({ decision: "Rejected" }).success, true);
});

test("reviewerDecisionSchema rejects any other value", () => {
  const result = reviewerDecisionSchema.safeParse({ decision: "Maybe" });
  assert.equal(result.success, false);
});
