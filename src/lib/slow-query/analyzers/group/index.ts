import type { SlowQueryFinding } from "#types/slow-query-analysis";
import type { QueryGroup } from "../../group/groupEntries";
import { bySeverity, type GroupAnalyzer } from "../types";
import { dominantTimeShare } from "./dominant_time_share";
import { highVariance } from "./high_variance";
import { consistentlyUnindexed } from "./consistently_unindexed";

const GROUP_ANALYZERS: readonly GroupAnalyzer[] = [
  dominantTimeShare,
  highVariance,
  consistentlyUnindexed,
];

export function analyzeGroup(group: QueryGroup): SlowQueryFinding[] {
  return GROUP_ANALYZERS.flatMap((analyzer) => analyzer.analyze(group)).sort(
    bySeverity,
  );
}
