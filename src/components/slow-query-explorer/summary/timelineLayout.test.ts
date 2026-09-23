import { describe, it, expect } from "vitest";
import {
  bucketTimeline,
  DEFAULT_TIMELINE_METRIC,
  type Timeline,
} from "#lib/slow-query";
import { loadSlowQueryLog } from "#lib/slow-query/parse/loadSlowQueryLog";
import { loadSlowQueryLogFixture } from "#test-utils/slow-query-fixtures";
import {
  bucketWindow,
  snapWindow,
  stackBucket,
  tickLabel,
  xTicks,
} from "./timelineLayout";

const { entries } = loadSlowQueryLog(
  loadSlowQueryLogFixture("6.0/standalone/slow-queries.jsonl"),
);
const metric = DEFAULT_TIMELINE_METRIC;
const timeline: Timeline = bucketTimeline(entries, metric);
const busiest = timeline.buckets.reduce((a, b) => (b.total > a.total ? b : a));
const HEIGHT = 100;

describe("stackBucket", () => {
  it("stacks the bucket's whole duration, longest entry at the bottom", () => {
    const segments = stackBucket(busiest, metric, busiest.total, HEIGHT, 1000);
    expect(segments).toHaveLength(busiest.count);
    const total = segments.reduce((sum, s) => sum + s.height, 0);
    expect(total).toBeCloseTo(HEIGHT);
    expect(segments[0]!.y + segments[0]!.height).toBeCloseTo(HEIGHT);
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i]!.height).toBeLessThanOrEqual(
        segments[i - 1]!.height + 1e-9,
      );
      expect(segments[i]!.y + segments[i]!.height).toBeCloseTo(
        segments[i - 1]!.y,
      );
    }
  });

  it("merges the smallest entries beyond the cap into one segment on top", () => {
    const cap = Math.max(2, Math.min(3, busiest.count));
    const segments = stackBucket(busiest, metric, busiest.total, HEIGHT, cap);
    if (busiest.count <= cap) {
      expect(segments.every((s) => s.kind === "entry")).toBe(true);
      return;
    }
    expect(segments).toHaveLength(cap);
    const rest = segments.at(-1)!;
    expect(rest.kind).toBe("rest");
    if (rest.kind !== "rest") return;
    expect(rest.count).toBe(busiest.count - (cap - 1));
    expect(rest.y).toBeCloseTo(0);
    const total = segments.reduce((sum, s) => sum + s.height, 0);
    expect(total).toBeCloseTo(HEIGHT);
  });

  it("scales against the tallest bucket", () => {
    const segments = stackBucket(
      busiest,
      metric,
      busiest.total * 2,
      HEIGHT,
      1000,
    );
    const total = segments.reduce((sum, s) => sum + s.height, 0);
    expect(total).toBeCloseTo(HEIGHT / 2);
  });

  it("renders nothing for an empty bucket", () => {
    const empty = { ...busiest, entries: [], count: 0, total: 0 };
    expect(stackBucket(empty, metric, 1, HEIGHT, 10)).toEqual([]);
  });
});

describe("snapWindow", () => {
  it("widens a brush to whole buckets with an inclusive end", () => {
    const n = timeline.buckets.length;
    const window = snapWindow(timeline, 0.5 / n, 2.5 / n);
    expect(window.start).toEqual(timeline.buckets[0]!.start);
    expect(window.end?.getTime()).toBe(
      timeline.buckets[2]!.start.getTime() + timeline.bucketMs - 1,
    );
  });

  it("accepts the brush in either direction and clamps to the chart", () => {
    const forward = snapWindow(timeline, 0.2, 0.7);
    expect(snapWindow(timeline, 0.7, 0.2)).toEqual(forward);
    const all = snapWindow(timeline, -1, 2);
    expect(all.start).toEqual(timeline.buckets[0]!.start);
    expect(all.end?.getTime()).toBe(
      timeline.buckets.at(-1)!.start.getTime() + timeline.bucketMs - 1,
    );
  });

  it("selects one bucket by index", () => {
    const window = bucketWindow(timeline, 1);
    expect(window.start).toEqual(timeline.buckets[1]!.start);
    expect(window.end?.getTime()).toBe(
      timeline.buckets[1]!.start.getTime() + timeline.bucketMs - 1,
    );
  });
});

describe("xTicks", () => {
  it("starts at the capture start and never crowds the right edge", () => {
    const ticks = xTicks(timeline, 6);
    expect(ticks[0]?.at).toBe(0);
    expect(ticks.length).toBeLessThanOrEqual(7);
    for (const tick of ticks) expect(tick.at).toBeLessThanOrEqual(0.92);
  });

  it("labels with the time of day within a day and the date beyond", () => {
    const date = new Date("2026-09-23T18:21:49Z");
    expect(tickLabel(date, 3_600_000)).toBe("18:21:49");
    expect(tickLabel(date, 3 * 86_400_000)).toBe("09-23 18:21");
  });
});
