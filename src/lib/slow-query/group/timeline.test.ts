import { describe, it, expect } from "vitest";
import { loadSlowQueryLog } from "../parse/loadSlowQueryLog";
import { bucketTimeline } from "./timeline";
import {
  DEFAULT_TIMELINE_METRIC,
  recordedTimelineMetrics,
  timelineMetricById,
} from "./timelineMetric";
import { summarizeWorkload } from "./workloadSummary";
import { sumKnown } from "./metrics";
import { loadSlowQueryLogFixture } from "#test-utils/slow-query-fixtures";

const { entries } = loadSlowQueryLog(
  loadSlowQueryLogFixture("6.0/standalone/slow-queries.jsonl"),
);

describe("bucketTimeline", () => {
  const timeline = bucketTimeline(entries, DEFAULT_TIMELINE_METRIC);

  it("keeps every entry and every millisecond", () => {
    const counted = timeline.buckets.reduce((n, b) => n + b.count, 0);
    expect(counted + timeline.untimed).toBe(entries.length);
    const total = timeline.buckets.reduce((n, b) => n + b.total, 0);
    expect(total).toBe(summarizeWorkload(entries).durationTotal);
  });

  it("uses at most the target number of round-sized buckets", () => {
    expect(timeline.buckets.length).toBeLessThanOrEqual(60);
    expect(timeline.buckets.length).toBeGreaterThan(0);
    expect([1000, 5000, 10000, 30000, 60000]).toContain(timeline.bucketMs);
    for (let i = 1; i < timeline.buckets.length; i++) {
      expect(
        timeline.buckets[i]!.start.getTime() -
          timeline.buckets[i - 1]!.start.getTime(),
      ).toBe(timeline.bucketMs);
    }
  });

  it("orders each bucket's entries longest first", () => {
    for (const bucket of timeline.buckets) {
      const durations = bucket.entries.map(
        (e) => e.metrics.durationMillis ?? 0,
      );
      expect(durations).toEqual([...durations].sort((a, b) => b - a));
      expect(bucket.count).toBe(bucket.entries.length);
    }
  });

  it("covers a given span regardless of which entries remain", () => {
    const span = {
      start: entries[0]!.timestamp!.getTime(),
      end: entries.at(-1)!.timestamp!.getTime(),
    };
    const metric = DEFAULT_TIMELINE_METRIC;
    const some = bucketTimeline(entries.slice(0, 3), metric, 60, span);
    const none = bucketTimeline([], metric, 60, span);
    expect(some.bucketMs).toBe(timeline.bucketMs);
    expect(some.buckets.length).toBe(timeline.buckets.length);
    expect(none.buckets.length).toBe(timeline.buckets.length);
    expect(some.buckets.reduce((n, b) => n + b.count, 0)).toBe(3);
    expect(none.buckets.every((b) => b.count === 0)).toBe(true);
  });

  it("pads a short span so one entry is a moment on an axis, not a block", () => {
    const single = bucketTimeline(entries.slice(0, 1), DEFAULT_TIMELINE_METRIC);
    expect(single.bucketMs).toBe(1000);
    expect(single.buckets).toHaveLength(20);
    expect(single.buckets.filter((b) => b.count === 1)).toHaveLength(1);
    const at = entries[0]!.timestamp!.getTime();
    expect(single.buckets[0]!.start.getTime()).toBeLessThanOrEqual(at);
    expect(single.buckets.at(-1)!.start.getTime() + 1000).toBeGreaterThan(at);
  });

  it("handles an empty log", () => {
    expect(bucketTimeline([], DEFAULT_TIMELINE_METRIC)).toEqual({
      metric: DEFAULT_TIMELINE_METRIC,
      bucketMs: 0,
      buckets: [],
      untimed: 0,
    });
  });

  it("measures CPU time in milliseconds and skips entries without it", () => {
    const cpu = timelineMetricById("cpu");
    const { entries: withCpu } = loadSlowQueryLog(
      loadSlowQueryLogFixture("8.0/docs-examples/slow-queries.jsonl"),
    );
    const timeline = bucketTimeline(withCpu, cpu);
    const total = timeline.buckets.reduce((n, b) => n + b.total, 0);
    expect(total).toBeCloseTo(sumKnown(withCpu, "cpuNanos")! / 1e6);
    for (const bucket of timeline.buckets) {
      const values = bucket.entries.map((e) => cpu.valueOf(e) ?? 0);
      expect(values).toEqual([...values].sort((a, b) => b - a));
    }
  });
});

describe("recordedTimelineMetrics", () => {
  it("offers CPU time only when some entry records it", () => {
    expect(recordedTimelineMetrics(entries).map((m) => m.id)).toEqual([
      "duration",
    ]);
    const { entries: withCpu } = loadSlowQueryLog(
      loadSlowQueryLogFixture("8.0/docs-examples/slow-queries.jsonl"),
    );
    expect(recordedTimelineMetrics(withCpu).map((m) => m.id)).toEqual([
      "duration",
      "cpu",
    ]);
  });
});
