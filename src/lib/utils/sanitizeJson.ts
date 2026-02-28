/**
 * Sanitize non-standard JSON tokens produced by MongoDB.
 *
 * MongoDB explain output can include JavaScript literals like Infinity,
 * -Infinity, and NaN (e.g., in index bounds). These are valid in
 * JavaScript but not in JSON, so we replace them with null before parsing.
 */
const NON_STANDARD_TOKENS = /:\s*(-?Infinity|NaN)\b/g;

export function sanitizeJsonText(text: string): string {
  return text.replace(NON_STANDARD_TOKENS, ": null");
}

/**
 * Parse raw explain plan text into a JavaScript object.
 *
 * This is the single entry point for converting text → object.
 * Handles MongoDB-specific quirks (Infinity, NaN) before JSON.parse.
 * Both the UI and test infrastructure should use this function
 * rather than calling JSON.parse directly.
 */
export function parseExplainPlanText(text: string): unknown {
  return JSON.parse(sanitizeJsonText(text));
}
