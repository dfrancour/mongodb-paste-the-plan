import type { SlowQueryEntry } from "#types/slow-query";
import type { SlowQueryFinding } from "#types/slow-query-analysis";
import type { QueryGroup } from "../group/groupEntries";
import type { WorkloadSummary } from "../group/workloadSummary";

export interface EntryAnalyzer {
  readonly id: string;
  /** Short name for filtering by this finding. */
  readonly label: string;
  readonly analyze: (entry: SlowQueryEntry) => SlowQueryFinding[];
}

export interface GroupAnalyzer {
  readonly id: string;
  readonly analyze: (group: QueryGroup) => SlowQueryFinding[];
}

export interface WorkloadInput {
  readonly entries: readonly SlowQueryEntry[];
  readonly summary: WorkloadSummary;
}

export interface WorkloadAnalyzer {
  readonly id: string;
  readonly analyze: (input: WorkloadInput) => SlowQueryFinding[];
}

/** Order findings by severity for display: critical, warning, info. */
export function bySeverity(a: SlowQueryFinding, b: SlowQueryFinding): number {
  const rank = { critical: 0, warning: 1, info: 2 };
  return rank[a.severity] - rank[b.severity];
}
