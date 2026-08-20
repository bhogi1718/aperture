import nodemailer from "nodemailer";
import { env } from "../../config/env.js";

/**
 * Sends OTP codes via plain SMTP (nodemailer) -- works with Gmail (using an
 * app password), or any transactional email provider that exposes SMTP
 * credentials (Resend, SendGrid, Mailgun, etc.). No cloud-specific SDK or
 * account required beyond the mail provider itself. Only instantiated when
 * EMAIL_OTP_PROVIDER=smtp.
 * @implements {import("./OtpProvider.js").OtpProvider}
 */
export class SmtpEmailOtpProvider {
  name = "smtp";

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: { user: env.smtpUser, pass: env.smtpPassword },
    });
  }

  async sendCode({ email, code }) {
    await this.transporter.sendMail({
      from: env.smtpFromAddress,
      to: email,
      subject: "Your Aperture verification code",
      text: `Your verification code is ${code}. It expires in 5 minutes.`,
      html: `<p>Your verification code is <strong style="font-size: 20px; letter-spacing: 2px;">${code}</strong>.</p><p>It expires in 5 minutes.</p>`,
    });
  }
}
