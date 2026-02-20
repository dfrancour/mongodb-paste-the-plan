// Barrel export for aggregation analyzers

import { matchAfterProject } from "./match_after_project";
import type { AggregationAnalyzer } from "../types";

// Re-export individual analyzers
export { matchAfterProject };

// Explicit array of all aggregation analyzers
export const AGGREGATION_ANALYZERS: readonly AggregationAnalyzer[] = [
  matchAfterProject,
] as const;
