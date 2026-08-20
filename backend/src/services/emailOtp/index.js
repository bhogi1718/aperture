import { env } from "../../config/env.js";
import { MockEmailOtpProvider } from "./MockEmailOtpProvider.js";
import { SmtpEmailOtpProvider } from "./SmtpEmailOtpProvider.js";

let provider;

/** @returns {import("./OtpProvider.js").OtpProvider} */
export function getEmailOtpProvider() {
  if (provider) return provider;

  provider = env.emailOtpProvider === "smtp" ? new SmtpEmailOtpProvider() : new MockEmailOtpProvider();

  return provider;
}
