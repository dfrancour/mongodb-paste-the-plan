// ESR (Equality, Sort, Range) Analysis
//
// Provides both:
// - Utility functions for ESR analysis (used by UI components)
// - Plan-level analyzer for generating findings

// Re-export analyzer
export { esrCompliance } from "./esr_compliance";

// Re-export utilities for UI components
export {
  extractQueryConditions,
  extractUsedIndexes,
  analyzeESRPattern,
  generateInsights,
  analyzeExplainPlan,
  type IndexInfo,
} from "./esr_utils";
