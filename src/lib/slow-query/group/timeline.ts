import type { SlowQueryEntry } from "#types/slow-query";
import type { TimelineMetric } from "./timelineMetric";

export interface TimelineBucket {
  readonly start: Date;
  /** Entries in the bucket, largest first, so a stack reads top-down. */
  readonly entries: readonly SlowQueryEntry[];
  readonly count: number;
  /** Sum of the metric over entries that record it, in milliseconds. */
  readonly total: number;
}

export interface Timeline {
  readonly metric: TimelineMetric;
  readonly bucketMs: number;
  readonly buckets: readonly TimelineBucket[];
  /** Entries without a timestamp, which no bucket can hold. */
  readonly untimed: number;
}

const BUCKET_SIZES_MS = [
  1_000, 5_000, 10_000, 30_000, 60_000, 300_000, 600_000, 1_800_000, 3_600_000,
  21_600_000, 86_400_000,
];
/** Fewer buckets than this is a block, not a timeline; short spans are padded. */
const MIN_BUCKETS = 20;

/** Milliseconds since the epoch, inclusive at both ends. */
export interface TimeSpan {
  readonly start: number;
  readonly end: number;
}

/**
 * Bucket entries into round-sized bins (seconds up to days): at most
 * `targetBuckets` of them, and never fewer than `MIN_BUCKETS`, with a short
 * span centered on a padded axis. Empty bins are kept so gaps in the log are
 * visible. The bins cover `span` when given, so the axis holds still while
 * other filters change, and entries outside it fall in no bin; otherwise
 * they cover the entries' own extent.
 */
export function bucketTimeline(
  entries: readonly SlowQueryEntry[],
  metric: TimelineMetric,
  targetBuckets = 60,
  span?: TimeSpan,
): Timeline {
  const timed = entries.flatMap((entry) =>
    entry.timestamp ? [{ entry, at: entry.timestamp.getTime() }] : [],
  );
  const untimed = entries.length - timed.length;
  const extent = span ?? timeSpanOf(entries);
  if (!extent) return { metric, bucketMs: 0, buckets: [], untimed };

  const { start: min, end: max } = extent;
  const bucketMs = pickBucketSize(max - min, targetBuckets);
  let first = Math.floor(min / bucketMs) * bucketMs;
  let bucketCount = Math.floor((max - first) / bucketMs) + 1;
  if (bucketCount < MIN_BUCKETS) {
    first -= Math.floor((MIN_BUCKETS - bucketCount) / 2) * bucketMs;
    bucketCount = MIN_BUCKETS;
  }

  const members = Array.from(
    { length: bucketCount },
    () => [] as SlowQueryEntry[],
  );
  for (const { entry, at } of timed) {
    members[Math.floor((at - first) / bucketMs)]?.push(entry);
  }
  const valueOf = (entry: SlowQueryEntry) => metric.valueOf(entry) ?? 0;
  return {
    metric,
    bucketMs,
    untimed,
    buckets: members.map((bucketEntries, i) => {
      bucketEntries.sort((a, b) => valueOf(b) - valueOf(a));
      return {
        start: new Date(first + i * bucketMs),
        entries: bucketEntries,
        count: bucketEntries.length,
        total: bucketEntries.reduce((sum, e) => sum + valueOf(e), 0),
      };
    }),
  };
}

/** Earliest and latest timestamps, or undefined when none is recorded. */
export function timeSpanOf(
  entries: readonly SlowQueryEntry[],
): TimeSpan | undefined {
  let start = Infinity;
  let end = -Infinity;
  for (const entry of entries) {
    const at = entry.timestamp?.getTime();
    if (at === undefined) continue;
    if (at < start) start = at;
    if (at > end) end = at;
  }
  return start <= end ? { start, end } : undefined;
}

function pickBucketSize(spanMs: number, targetBuckets: number): number {
  for (const size of BUCKET_SIZES_MS) {
    if (spanMs / size <= targetBuckets) return size;
  }
  return BUCKET_SIZES_MS.at(-1)!;
}
