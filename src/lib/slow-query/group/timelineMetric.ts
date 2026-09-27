import type { SlowQueryEntry } from "#types/slow-query";

export type TimelineMetricId = "duration" | "cpu";

/** What the timeline's bars measure, in milliseconds per entry. */
export interface TimelineMetric {
  readonly id: TimelineMetricId;
  readonly label: string;
  /** Undefined when the server did not record it for the entry. */
  readonly valueOf: (entry: SlowQueryEntry) => number | undefined;
}

const TIMELINE_METRICS: readonly TimelineMetric[] = [
  {
    id: "duration",
    label: "Duration",
    valueOf: (entry) => entry.metrics.durationMillis,
  },
  {
    id: "cpu",
    label: "CPU time",
    valueOf: (entry) =>
      entry.metrics.cpuNanos === undefined
        ? undefined
        : entry.metrics.cpuNanos / 1e6,
  },
];

export const DEFAULT_TIMELINE_METRIC = TIMELINE_METRICS[0]!;

export function timelineMetricById(id: TimelineMetricId): TimelineMetric {
  return TIMELINE_METRICS.find((metric) => metric.id === id)!;
}

/** Metrics at least one entry records, so the chart never offers an empty view. */
export function recordedTimelineMetrics(
  entries: readonly SlowQueryEntry[],
): TimelineMetric[] {
  return TIMELINE_METRICS.filter((metric) =>
    entries.some((entry) => metric.valueOf(entry) !== undefined),
  );
}
