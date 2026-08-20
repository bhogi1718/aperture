/**
 * Default OTP provider: logs the code to the server console instead of
 * sending a real WhatsApp/SMS message. No external account or API keys
 * needed, so the whole verification flow is demoable and testable without
 * a live provider -- same rationale as MockProvider for the LLM layer.
 * @implements {import("./OtpProvider.js").OtpProvider}
 */
export class MockOtpProvider {
  name = "mock";

  async sendCode({ phone, code }) {
    console.log(`[MockOtpProvider] OTP for ${phone}: ${code}`);
  }
}
