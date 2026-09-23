import type { SlowQueryEntry } from "#types/slow-query";
import { groupLabelOf, type GroupDimension } from "./dimensions";
import { knownValues, sumKnown } from "./metrics";
import { percentile } from "./percentiles";

export interface GroupStats {
  readonly count: number;
  readonly cursorBatchCount: number;
  readonly collectionScanCount: number;
  readonly durationTotal?: number;
  readonly durationAvg?: number;
  readonly durationP50?: number;
  readonly durationP95?: number;
  readonly durationMax?: number;
  /** Share of the cumulative duration across all grouped entries, 0..1. */
  readonly timeShare?: number;
  readonly bytesRead?: number;
}

export interface QueryGroup {
  readonly key: string;
  readonly label: string;
  readonly entries: readonly SlowQueryEntry[];
  readonly stats: GroupStats;
}

export function groupEntries(
  entries: readonly SlowQueryEntry[],
  dimension: GroupDimension,
): QueryGroup[] {
  const buckets = new Map<
    string,
    { label: string; entries: SlowQueryEntry[] }
  >();
  for (const entry of entries) {
    const key = dimension.keyOf(entry);
    const bucket = buckets.get(key);
    if (bucket) bucket.entries.push(entry);
    else
      buckets.set(key, {
        label: groupLabelOf(dimension, entry),
        entries: [entry],
      });
  }
  const overallTotal = sumKnown(entries, "durationMillis");
  return [...buckets.entries()].map(([key, bucket]) => ({
    key,
    label: bucket.label,
    entries: bucket.entries,
    stats: computeStats(bucket.entries, overallTotal),
  }));
}

function computeStats(
  entries: readonly SlowQueryEntry[],
  overallDurationTotal: number | undefined,
): GroupStats {
  const durations = knownValues(entries, "durationMillis").sort(
    (a, b) => a - b,
  );
  const durationTotal = durations.length
    ? durations.reduce((sum, d) => sum + d, 0)
    : undefined;
  return {
    count: entries.length,
    cursorBatchCount: entries.filter((e) => e.flags.isCursorBatch).length,
    collectionScanCount: entries.filter((e) =>
      e.planSummaryStages.some((s) => s.stage === "COLLSCAN"),
    ).length,
    durationTotal,
    durationAvg:
      durationTotal === undefined
        ? undefined
        : durationTotal / durations.length,
    durationP50: percentile(durations, 50),
    durationP95: percentile(durations, 95),
    durationMax: durations.at(-1),
    timeShare:
      durationTotal !== undefined && overallDurationTotal
        ? durationTotal / overallDurationTotal
        : undefined,
    bytesRead: sumKnown(entries, "bytesRead"),
  };
}
