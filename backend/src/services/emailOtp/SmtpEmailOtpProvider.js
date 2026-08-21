import nodemailer from "nodemailer";
import { env } from "../../config/env.js";
import { FEATURE_LABELS } from "../llm/explanationPrompt.js";

const TIER_COLORS = {
  Approve: "#0a6e62",
  "Manual Review": "#8a5709",
  Reject: "#b02525",
};

function reviewerNotificationHtml({ applicationId, applicantName, applicantEmail, riskTier, probabilityOfDefault, fraudFlags }) {
  const color = TIER_COLORS[riskTier] ?? "#333";
  const flags = fraudFlags?.length
    ? `<p style="color: #b02525; font-weight: 600; margin-top: 16px;">⚠ ${fraudFlags.length} fraud signal${fraudFlags.length > 1 ? "s" : ""} flagged</p>`
    : "";

  return `
    <div style="font-family: -apple-system, Segoe UI, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="margin-bottom: 4px;">New application submitted</h2>
      <p style="color: #555;">${applicantName} (${applicantEmail}) just submitted an application.</p>
      <p style="font-size: 20px; font-weight: 700; color: ${color}; margin: 16px 0 4px;">${riskTier}</p>
      <p style="color: #555; margin-top: 0;">Estimated risk: ${(probabilityOfDefault * 100).toFixed(1)}%</p>
      ${flags}
      <p style="color: #999; font-size: 12px; margin-top: 24px;">Application ID: ${applicationId}. Sign in to the reviewer dashboard for the full explanation and factors.</p>
    </div>
  `;
}

function decisionEmailHtml({ name, riskTier, probabilityOfDefault, explanation, topContributingFeatures }) {
  const color = TIER_COLORS[riskTier] ?? "#333";
  const factors = topContributingFeatures
    .slice(0, 5)
    .map((f) => `<li>${FEATURE_LABELS[f.feature] ?? f.feature}</li>`)
    .join("");

  return `
    <div style="font-family: -apple-system, Segoe UI, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="margin-bottom: 4px;">Hi ${name ?? "there"},</h2>
      <p style="color: #555;">Your Aperture application has been decided.</p>
      <p style="font-size: 20px; font-weight: 700; color: ${color}; margin: 16px 0 4px;">${riskTier}</p>
      <p style="color: #555; margin-top: 0;">Estimated risk: ${(probabilityOfDefault * 100).toFixed(1)}%</p>
      <p style="line-height: 1.6;">${explanation}</p>
      ${factors ? `<p style="margin-bottom: 4px;"><strong>Top contributing factors:</strong></p><ul style="color: #555;">${factors}</ul>` : ""}
      <p style="color: #999; font-size: 12px; margin-top: 24px;">This is an automated decision summary from Aperture. Sign in to view the full explanation and history.</p>
    </div>
  `;
}

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

  async sendDecisionEmail({ email, name, riskTier, probabilityOfDefault, explanation, topContributingFeatures }) {
    await this.transporter.sendMail({
      from: env.smtpFromAddress,
      to: email,
      subject: `Your Aperture decision: ${riskTier}`,
      text: `${riskTier} -- estimated risk ${(probabilityOfDefault * 100).toFixed(1)}%. ${explanation}`,
      html: decisionEmailHtml({ name, riskTier, probabilityOfDefault, explanation, topContributingFeatures }),
    });
  }

  async sendReviewerNotification({ applicationId, applicantName, applicantEmail, riskTier, probabilityOfDefault, fraudFlags }) {
    if (!env.reviewerNotificationEmail) return;

    await this.transporter.sendMail({
      from: env.smtpFromAddress,
      to: env.reviewerNotificationEmail,
      subject: `New Aperture application: ${riskTier}${fraudFlags?.length ? " ⚠" : ""}`,
      text: `${applicantName} (${applicantEmail}) submitted an application. Decision: ${riskTier}, estimated risk ${(probabilityOfDefault * 100).toFixed(1)}%. Application ID: ${applicationId}.`,
      html: reviewerNotificationHtml({ applicationId, applicantName, applicantEmail, riskTier, probabilityOfDefault, fraudFlags }),
    });
  }
}
