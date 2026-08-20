import { env } from "../../config/env.js";
import { MockOtpProvider } from "./MockOtpProvider.js";
import { WhatsAppOtpProvider } from "./WhatsAppOtpProvider.js";

let provider;

/** @returns {import("./OtpProvider.js").OtpProvider} */
export function getOtpProvider() {
  if (provider) return provider;

  provider = env.otpProvider === "whatsapp" ? new WhatsAppOtpProvider() : new MockOtpProvider();

  return provider;
}
