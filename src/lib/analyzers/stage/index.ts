// Barrel export for stage analyzers

import { lowDocumentEfficiency } from "./low_document_efficiency";
import { highExecutionTime } from "./high_execution_time";
import { expensiveSort } from "./expensive_sort";
import { inefficientFetch } from "./inefficient_fetch";
import { spillingDetection } from "./spilling_detection";
import type { StageMetricsAnalyzer } from "../types";

// Re-export individual analyzers
export {
  lowDocumentEfficiency,
  highExecutionTime,
  expensiveSort,
  inefficientFetch,
  spillingDetection,
};

// Explicit array of all stage analyzers
export const STAGE_ANALYZERS: readonly StageMetricsAnalyzer[] = [
  lowDocumentEfficiency,
  highExecutionTime,
  expensiveSort,
  inefficientFetch,
  spillingDetection,
] as const;
