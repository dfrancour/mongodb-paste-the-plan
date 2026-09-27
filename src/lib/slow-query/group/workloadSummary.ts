import type { SlowQueryEntry } from "#types/slow-query";
import { sumKnown } from "./metrics";

/** The whole-log counts the workload analyzers reason about. */
export interface WorkloadSummary {
  readonly entryCount: number;
  readonly cursorBatchCount: number;
  readonly collectionScanCount: number;
  readonly durationTotal?: number;
}

export function summarizeWorkload(
  entries: readonly SlowQueryEntry[],
): WorkloadSummary {
  return {
    entryCount: entries.length,
    cursorBatchCount: entries.filter((e) => e.flags.isCursorBatch).length,
    collectionScanCount: entries.filter((e) =>
      e.planSummaryStages.some((s) => s.stage === "COLLSCAN"),
    ).length,
    durationTotal: sumKnown(entries, "durationMillis"),
  };
}
