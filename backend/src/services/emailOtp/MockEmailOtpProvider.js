/**
 * Default OTP provider: logs the code to the server console instead of
 * sending a real email. No SMTP account or API key needed, so the whole
 * verification flow is demoable and testable without a live provider --
 * same rationale as MockProvider for the LLM layer.
 * @implements {import("./OtpProvider.js").OtpProvider}
 */
export class MockEmailOtpProvider {
  name = "mock";

  async sendCode({ email, code }) {
    console.log(`[MockEmailOtpProvider] OTP for ${email}: ${code}`);
  }

  async sendDecisionEmail({ email, riskTier }) {
    console.log(`[MockEmailOtpProvider] Decision email for ${email}: ${riskTier}`);
  }

  async sendReviewerNotification({ applicationId, applicantName, applicantEmail, riskTier }) {
    console.log(
      `[MockEmailOtpProvider] Reviewer notification: ${applicantName} (${applicantEmail}) -- application ${applicationId} -- ${riskTier}`
    );
  }
}
