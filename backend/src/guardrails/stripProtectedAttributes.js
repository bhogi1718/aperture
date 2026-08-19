/**
 * Strips protected-attribute language from free text before it reaches any
 * LLM prompt. Deterministic wordlist/regex approach: auditable (the exact
 * term list is visible in this file), zero external dependency or latency,
 * and the redaction count is designed to feed straight into audit_log.
 *
 * This is a hackathon-scope safety net demonstrating the guardrail pattern,
 * not a production-grade NLP redaction system -- it will not catch every
 * possible phrasing.
 */

const PROTECTED_TERM_PATTERNS = {
  gender: /\b(male|female|man|woman|men|women|husband|wife|boyfriend|girlfriend|transgender|non-binary|nonbinary)\b/gi,
  religion: /\b(hindu|muslim|islam(?:ic)?|christian|sikh|buddhist|jain|parsi|jewish|atheist)\b/gi,
  caste: /\b(brahmin|kshatriya|vaishya|shudra|dalit|obc|sc\/st|scheduled caste|scheduled tribe)\b/gi,
  disability: /\b(disabled|disability|handicapped|blind|deaf|wheelchair[- ]?bound)\b/gi,
  maritalStatus: /\b(married|unmarried|single|divorced|widow(?:ed)?)\b/gi,
};

export function stripProtectedAttributes(text) {
  if (!text) {
    return { text: text ?? "", redactionCount: 0, redactedCategories: [] };
  }

  let result = text;
  let redactionCount = 0;
  const redactedCategories = [];

  for (const [category, pattern] of Object.entries(PROTECTED_TERM_PATTERNS)) {
    const matches = result.match(pattern);
    if (matches?.length) {
      redactionCount += matches.length;
      redactedCategories.push(category);
      result = result.replace(pattern, "[REDACTED]");
    }
  }

  return { text: result, redactionCount, redactedCategories };
}
