// Barrel export for stage definition analyzers

import { collscanAntipattern } from "./collscan_antipattern";
import {
  coveredQueryOptimal,
  COVERED_QUERY_ANALYZER_ID,
} from "./covered_query_optimal";
import { joinWarning } from "./join_warning";
import { blockingStageWarning } from "./blocking_stage_warning";
import type { StageDefinitionAnalyzer } from "../types";

// Re-export individual analyzers and constants
export {
  collscanAntipattern,
  coveredQueryOptimal,
  joinWarning,
  blockingStageWarning,
  COVERED_QUERY_ANALYZER_ID,
};

// Explicit array of all stage definition analyzers
export const STAGE_DEFINITION_ANALYZERS: readonly StageDefinitionAnalyzer[] = [
  collscanAntipattern,
  coveredQueryOptimal,
  joinWarning,
  blockingStageWarning,
] as const;
