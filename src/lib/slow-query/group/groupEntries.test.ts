import { describe, it, expect } from "vitest";
import { loadSlowQueryLog } from "../parse/loadSlowQueryLog";
import { GROUP_DIMENSIONS, groupDimensionById } from "./dimensions";
import { groupEntries } from "./groupEntries";
import { summarizeWorkload } from "./workloadSummary";
import { percentile } from "./percentiles";
import { loadSlowQueryLogFixture } from "#test-utils/slow-query-fixtures";

const { entries } = loadSlowQueryLog(
  loadSlowQueryLogFixture("6.0/standalone/slow-queries.jsonl"),
);

describe("groupEntries", () => {
  it("accounts for every entry under every dimension", () => {
    for (const dimension of GROUP_DIMENSIONS) {
      const groups = groupEntries(entries, dimension);
      const counted = groups.reduce((n, g) => n + g.stats.count, 0);
      expect(counted, dimension.id).toBe(entries.length);
    }
  });

  it("sums group durations to the workload total and shares to 1", () => {
    const total = summarizeWorkload(entries).durationTotal!;
    for (const dimension of GROUP_DIMENSIONS) {
      const groups = groupEntries(entries, dimension);
      const summed = groups.reduce(
        (n, g) => n + (g.stats.durationTotal ?? 0),
        0,
      );
      expect(summed, dimension.id).toBe(total);
      const share = groups.reduce((n, g) => n + (g.stats.timeShare ?? 0), 0);
      expect(share, dimension.id).toBeCloseTo(1, 6);
    }
  });

  it("keys plan summaries within their namespace", () => {
    const groups = groupEntries(entries, groupDimensionById("planSummary"));
    const collscans = groups.filter((g) => g.key.endsWith(" · COLLSCAN"));
    expect(collscans.length).toBeGreaterThan(1);
    expect(new Set(collscans.map((g) => g.entries[0]!.namespace)).size).toBe(
      collscans.length,
    );
    for (const group of collscans) {
      expect(
        group.entries.every((e) => e.namespace === group.entries[0]!.namespace),
      ).toBe(true);
    }
  });

  it("keeps unknown metrics unknown rather than zero", () => {
    const untimed = entries.map((e) => ({
      ...e,
      metrics: { ...e.metrics, durationMillis: undefined },
    }));
    const stats = groupEntries(untimed, groupDimensionById("command"))[0]!
      .stats;
    expect(stats.durationTotal).toBeUndefined();
    expect(stats.durationAvg).toBeUndefined();
    expect(stats.durationMax).toBeUndefined();
  });

  it("orders percentiles sensibly", () => {
    for (const group of groupEntries(entries, groupDimensionById("shape"))) {
      const { durationP50, durationP95, durationMax } = group.stats;
      if (durationMax === undefined) continue;
      expect(durationP50!).toBeLessThanOrEqual(durationP95!);
      expect(durationP95!).toBeLessThanOrEqual(durationMax);
    }
  });

  it("attributes cursor batches to their originating command's shape", () => {
    const groups = groupEntries(entries, groupDimensionById("shape"));
    const mixed = groups.filter(
      (g) =>
        g.stats.cursorBatchCount > 0 &&
        g.stats.cursorBatchCount < g.stats.count,
    );
    expect(mixed.length).toBeGreaterThan(0);
  });
});

describe("percentile", () => {
  it("uses nearest rank", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(values, 50)).toBe(5);
    expect(percentile(values, 95)).toBe(10);
    expect(percentile([7], 95)).toBe(7);
    expect(percentile([], 50)).toBeUndefined();
  });
});
