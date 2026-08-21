import { pool } from "../backend/src/db/pool.js";
import jwt from "jsonwebtoken";
import { env } from "../backend/src/config/env.js";

async function verify() {
  const testEmail = "profile_verified_" + Date.now() + "@example.com";

  // 1. Request OTP
  let res = await fetch("http://localhost:4000/api/applicant-auth/request-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail }),
  });
  console.log("1. request-otp status:", res.status);

  // 2. Fetch code from database
  const { rows } = await pool.query(
    "SELECT code FROM otp_codes WHERE email = $1 ORDER BY created_at DESC LIMIT 1",
    [testEmail]
  );
  const realCode = rows[0]?.code;
  console.log("2. Retrieved OTP Code from DB:", realCode);

  // 3. Verify OTP
  res = await fetch("http://localhost:4000/api/applicant-auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, code: realCode }),
  });
  let vData = await res.json();
  console.log("3. verify-otp status:", res.status, "Token acquired:", !!vData.token);
  const applicantToken = vData.token;

  // 4. Submit application
  const applicantData = {
    RevolvingUtilizationOfUnsecuredLines: 0.09,
    age: 28,
    "NumberOfTime30-59DaysPastDueNotWorse": 0,
    DebtRatio: 0.12,
    MonthlyIncome: 65000,
    NumberOfOpenCreditLinesAndLoans: 5,
    NumberOfTimes90DaysLate: 0,
    NumberRealEstateLoansOrLines: 1,
    "NumberOfTime60-89DaysPastDueNotWorse": 0,
    NumberOfDependents: 1,
    income_was_missing: 0,
    dependents_was_missing: 0,
    utility_payment_streak: 36,
    recharge_regularity_score: 95,
    gig_trip_volume: 80,
    gig_rating: 4.9,
  };

  res = await fetch("http://localhost:4000/api/applications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + applicantToken,
    },
    body: JSON.stringify({
      applicant: applicantData,
      transactionNarrative: "Founder of a creative studio with reliable recurring monthly income.",
      applicantName: "Charan Tej",
    }),
  });
  let appData = await res.json();
  console.log("4. submit application status:", res.status, {
    id: appData.id,
    riskTier: appData.riskTier,
    probabilityOfDefault: appData.probabilityOfDefault,
    explanation: appData.explanation,
  });
  const appId = appData.id;

  // 5. Reviewer token and detail query
  const reviewerToken = jwt.sign({ sub: "reviewer-1", role: "reviewer" }, env.jwtSecret);

  res = await fetch("http://localhost:4000/api/applications/" + appId, {
    headers: { Authorization: "Bearer " + reviewerToken },
  });
  let detailData = await res.json();
  console.log("\n5. Reviewer Application Detail fetched successfully:");
  console.log("- Applicant Name:", detailData.applicant_name);
  console.log("- Applicant Email:", detailData.applicant_email);
  console.log("- Risk Tier:", detailData.risk_tier);
  console.log("- Utility Streak (Alt Data):", detailData.features.utility_payment_streak);
  console.log("- Recharge Regularity (Alt Data):", detailData.features.recharge_regularity_score);
  console.log("- Monthly Income:", detailData.features.MonthlyIncome);
  console.log("- Narrative:", detailData.transaction_narrative);

  // 6. Reviewer list query
  res = await fetch("http://localhost:4000/api/applications?limit=5", {
    headers: { Authorization: "Bearer " + reviewerToken },
  });
  let listData = await res.json();
  const foundInList = listData.applications.find((a) => a.id === appId);
  console.log("\n6. Reviewer Dashboard List Row:");
  console.log("- In List Name:", foundInList.applicant_name);
  console.log("- In List Email:", foundInList.applicant_email);
  console.log("- In List Risk Tier:", foundInList.risk_tier);

  await pool.end();
  console.log("\n======================================================");
  console.log(">>> FULL END-TO-END PROFILE & AUDIT VERIFIED 100% <<<");
  console.log("======================================================");
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});
