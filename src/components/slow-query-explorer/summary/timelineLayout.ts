import type {
  Timeline,
  TimelineBucket,
  TimelineMetric,
  TimeWindow,
} from "#lib/slow-query";
import type { SlowQueryEntry } from "#types/slow-query";

interface EntrySegment {
  readonly kind: "entry";
  readonly entry: SlowQueryEntry;
  readonly y: number;
  readonly height: number;
}

/** The smallest entries of a bucket, merged so a busy bucket stays legible. */
interface RestSegment {
  readonly kind: "rest";
  readonly entries: readonly SlowQueryEntry[];
  readonly count: number;
  readonly total: number;
  readonly y: number;
  readonly height: number;
}

export type Segment = EntrySegment | RestSegment;

interface Tick {
  /** Position along the chart, 0 at the left edge and 1 at the right. */
  readonly at: number;
  readonly label: string;
}

/**
 * Stack a bucket's entries from the baseline up, largest at the bottom.
 * Heights are shares of `maxHeight`, the tallest bucket's bar. Beyond
 * `maxSegments`, the remaining entries become one segment on top. Entries
 * without the metric take no height.
 */
export function stackBucket(
  bucket: TimelineBucket,
  metric: TimelineMetric,
  maxTotal: number,
  maxHeight: number,
  maxSegments: number,
): Segment[] {
  if (bucket.total <= 0 || bucket.count === 0) return [];
  const barHeight = (bucket.total / maxTotal) * maxHeight;
  const unit = barHeight / bucket.total;
  const shown =
    bucket.count > maxSegments
      ? bucket.entries.slice(0, maxSegments - 1)
      : bucket.entries;
  const rest = bucket.entries.slice(shown.length);

  const segments: Segment[] = [];
  let top = maxHeight;
  for (const entry of shown) {
    const height = (metric.valueOf(entry) ?? 0) * unit;
    top -= height;
    segments.push({ kind: "entry", entry, y: top, height });
  }
  if (rest.length > 0) {
    const total = rest.reduce((sum, e) => sum + (metric.valueOf(e) ?? 0), 0);
    const height = total * unit;
    top -= height;
    segments.push({
      kind: "rest",
      entries: rest,
      count: rest.length,
      total,
      y: top,
      height,
    });
  }
  return segments;
}

/** Evenly spaced ticks on bucket boundaries, the capture start first. */
export function xTicks(timeline: Timeline, count: number): Tick[] {
  const n = timeline.buckets.length;
  if (n === 0) return [];
  const spanMs = n * timeline.bucketMs;
  const step = Math.max(1, Math.ceil(n / count));
  const ticks: Tick[] = [];
  for (let i = 0; i < n; i += step) {
    const at = i / n;
    if (at > 0.92) break;
    ticks.push({
      at,
      label: tickLabel(timeline.buckets[i]!.start, spanMs),
    });
  }
  return ticks;
}

const DAY_MS = 86_400_000;

/** Time of day within a day, date and time beyond it, UTC throughout. */
export function tickLabel(date: Date, spanMs: number): string {
  const iso = date.toISOString();
  const time = iso.slice(11, 19);
  return spanMs < DAY_MS ? time : `${iso.slice(5, 10)} ${time.slice(0, 5)}`;
}

/**
 * The time window for a brush between two chart positions (0 to 1),
 * widened to whole buckets. The end is inclusive, so it stops one
 * millisecond short of the next bucket.
 */
export function snapWindow(timeline: Timeline, from: number, to: number) {
  const n = timeline.buckets.length;
  const index = (at: number) =>
    Math.min(n - 1, Math.max(0, Math.floor(at * n)));
  const [lo, hi] = [index(Math.min(from, to)), index(Math.max(from, to))];
  return windowOf(timeline, lo, hi);
}

export function bucketWindow(timeline: Timeline, index: number): TimeWindow {
  return windowOf(timeline, index, index);
}

function windowOf(timeline: Timeline, lo: number, hi: number): TimeWindow {
  return {
    start: timeline.buckets[lo]!.start,
    end: new Date(
      timeline.buckets[hi]!.start.getTime() + timeline.bucketMs - 1,
    ),
  };
}
