/**
 * Public API for MongoDB explain plan parsing.
 *
 * Primary entry point: `parsePlan()` — one call, complete result.
 * Lower-level utilities are also exported for tests and edge cases.
 */

// Main pipeline
export { parsePlan, validatePlan } from "./pipeline";
export type { ParsedPlan } from "./pipeline";

// Errors
export { PlanParseError } from "./errors";

// Lower-level utilities
export { transformExtendedJSON } from "./extendedJson";
export { detectPlanMode, detectExplainMode, isSBEPlan } from "./detection";
export { normalizePlan, normalizeExecution } from "./normalization";
export { extractSBEPlan, extractHybridSBEPlan } from "./sbeExtractor";

// Re-export existing utilities
export { SBEParser } from "./sbeParser";
export { CommandExtractor } from "./commandExtractor";
