// Barrel export for plan analyzers

import { overallEfficiency } from "./overall_efficiency";
import {
  inMemorySort,
  IN_MEMORY_SORT_ANALYZER_ID,
  IN_MEMORY_SORT_FINDING_PREFIX,
} from "./in_memory_sort";
import { esrCompliance } from "./esr";
import type { PlanAnalyzer } from "../types";

// Re-export individual analyzers
export {
  overallEfficiency,
  inMemorySort,
  IN_MEMORY_SORT_ANALYZER_ID,
  IN_MEMORY_SORT_FINDING_PREFIX,
};

// ESR analysis - re-export analyzer and utilities
export {
  esrCompliance,
  // Utilities for UI components
  extractQueryConditions,
  extractUsedIndexes,
  analyzeESRPattern,
  generateInsights,
  analyzeExplainPlan,
  type IndexInfo,
} from "./esr";

// Plan selection and summary analysis
export { analyzePlanSelection } from "./plan_selection";
export { summarizePlan } from "./plan_summary";

// SBE slot analysis utilities
export { buildSlotLineages, generateSlotTrace } from "./sbe";

// Explicit array of all plan analyzers
export const PLAN_ANALYZERS: readonly PlanAnalyzer[] = [
  overallEfficiency,
  inMemorySort,
  esrCompliance,
] as const;
