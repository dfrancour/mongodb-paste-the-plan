// Barrel export for stage analyzers

import { lowSelectivity } from "./low_selectivity";
import { highExecutionTime } from "./high_execution_time";
import { expensiveSort } from "./expensive_sort";
import { inefficientFetch } from "./inefficient_fetch";
import type { StageMetricsAnalyzer } from "../types";

// Re-export individual analyzers
export { lowSelectivity, highExecutionTime, expensiveSort, inefficientFetch };

// Explicit array of all stage analyzers
export const STAGE_ANALYZERS: readonly StageMetricsAnalyzer[] = [
  lowSelectivity,
  highExecutionTime,
  expensiveSort,
  inefficientFetch,
] as const;
