import { env } from "../../config/env.js";

/**
 * Sends OTP codes via the WhatsApp Business Cloud API
 * (https://developers.facebook.com/docs/whatsapp/cloud-api). Requires a
 * verified WhatsApp Business sender number and a permanent access token --
 * only instantiated when OTP_PROVIDER=whatsapp. Uses an approved
 * "authentication" template message, since WhatsApp does not allow
 * free-form text outside a 24-hour customer service window.
 * @implements {import("./OtpProvider.js").OtpProvider}
 */
export class WhatsAppOtpProvider {
  name = "whatsapp";

  async sendCode({ phone, code }) {
    const url = `https://graph.facebook.com/v21.0/${env.whatsappPhoneNumberId}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.whatsappAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: env.whatsappOtpTemplateName,
          language: { code: "en_US" },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: code }],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: code }],
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`WhatsApp OTP send failed (${response.status}): ${detail}`);
    }
  }
}
