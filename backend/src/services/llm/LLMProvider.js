/**
 * @typedef {Object} FeatureContribution
 * @property {string} feature
 * @property {number} shap_value
 * @property {number} feature_value
 *
 * @typedef {Object} LLMProvider
 * @property {string} name
 * @property {(args: { probability: number, riskTier: string, topFeatures: FeatureContribution[] }) => Promise<{ explanation: string, modelId: string | null }>} generateExplanation
 * @property {(text: string) => Promise<{ embedding: number[], modelId: string | null }>} embed
 */

export {};
