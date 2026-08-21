/**
 * @typedef {Object} OtpProvider
 * @property {string} name
 * @property {(args: { email: string, code: string }) => Promise<void>} sendCode
 * @property {(args: { email: string, name: string, riskTier: string, probabilityOfDefault: number, explanation: string, topContributingFeatures: Array<{feature: string, shap_value: number}> }) => Promise<void>} sendDecisionEmail
 * @property {(args: { applicationId: string, applicantName: string, applicantEmail: string, riskTier: string, probabilityOfDefault: number, fraudFlags: string[] }) => Promise<void>} sendReviewerNotification
 */

export {};
