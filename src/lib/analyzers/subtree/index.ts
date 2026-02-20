// Barrel export for subtree analyzers

import { selfTimeAnalysis, calculateSelfTime } from "./self_time_analysis";
import type { SubtreeAnalyzer } from "../types";

// Re-export individual analyzers
export { selfTimeAnalysis, calculateSelfTime };

// Explicit array of all subtree analyzers
export const SUBTREE_ANALYZERS: readonly SubtreeAnalyzer[] = [
  selfTimeAnalysis,
] as const;
