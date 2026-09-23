import { describe, it, expect } from "vitest";
import { loadSlowQueryLog } from "../parse/loadSlowQueryLog";
import { groupDimensionById } from "../group/dimensions";
import { groupEntries } from "../group/groupEntries";
import { summarizeWorkload } from "../group/workloadSummary";
import { analyzeEntry, analyzeGroup, analyzeWorkload } from "./index";
import { loadSlowQueryLogFixture } from "#test-utils/slow-query-fixtures";

const { entries } = loadSlowQueryLog(
  loadSlowQueryLogFixture("6.0/standalone/slow-queries.jsonl"),
);
const docsEntries = loadSlowQueryLog(
  loadSlowQueryLogFixture("8.0/docs-examples/slow-queries.jsonl"),
).entries;

const findingIds = (ids: string[]) => new Set(ids);

describe("entry analyzers", () => {
  it("flag collection scans and only collection scans", () => {
    for (const entry of entries) {
      const ids = findingIds(analyzeEntry(entry).map((f) => f.id));
      const scanned = entry.planSummaryStages.some(
        (s) => s.stage === "COLLSCAN",
      );
      expect(ids.has("collection-scan"), entry.planSummary).toBe(scanned);
    }
  });

  it("flag low document efficiency using the explain-plan thresholds", () => {
    const flagged = entries.filter((e) =>
      analyzeEntry(e).some((f) => f.id === "low-document-efficiency"),
    );
    expect(flagged.length).toBeGreaterThan(0);
    for (const entry of flagged) {
      const { docsExamined, nreturned } = entry.metrics;
      expect(docsExamined!).toBeGreaterThanOrEqual(100);
      expect(
        docsExamined! / Math.max(nreturned ?? 0, 1),
      ).toBeGreaterThanOrEqual(10);
    }
  });

  it("flag in-memory sorts and truncated commands", () => {
    const sorts = entries.filter((e) => e.flags.hasSortStage);
    expect(sorts.length).toBeGreaterThan(0);
    for (const entry of sorts) {
      expect(analyzeEntry(entry).map((f) => f.id)).toContain("in-memory-sort");
    }
    const truncated = entries.find((e) => e.flags.isTruncated)!;
    expect(analyzeEntry(truncated).map((f) => f.id)).toContain(
      "truncated-command",
    );
  });

  it("flag queue wait from 8.0 queue metrics", () => {
    const queued = docsEntries[1]!; // 180 ms queued of 300 ms
    const finding = analyzeEntry(queued).find((f) => f.id === "queue-wait");
    expect(finding?.severity).toBe("warning");
    expect(
      analyzeEntry(docsEntries[0]!).some((f) => f.id === "queue-wait"),
    ).toBe(false);
  });

  it("flag planning and storage reads that dominate the duration", () => {
    const base = entries[0]!;
    const withMetrics = (metrics: Partial<typeof base.metrics>) => ({
      ...base,
      metrics: { ...base.metrics, ...metrics },
    });
    const planningHeavy = analyzeEntry(
      withMetrics({ durationMillis: 10_000, planningTimeMicros: 9_000_000 }),
    ).find((f) => f.id === "planning-time");
    expect(planningHeavy?.severity).toBe("critical");
    expect(planningHeavy?.description).toMatch(/^90% of durationMillis/);

    const readHeavy = analyzeEntry(
      withMetrics({
        durationMillis: 10_000,
        timeReadingMicros: 6_000_000,
        bytesRead: 5 * 1024 ** 3,
        reslen: 243,
      }),
    ).find((f) => f.id === "storage-read");
    expect(readHeavy?.severity).toBe("warning");
    expect(readHeavy?.description).toContain(
      "5.0 GB were read from disk to return 243 B",
    );

    const quiet = analyzeEntry(
      withMetrics({
        durationMillis: 10_000,
        planningTimeMicros: 100_000,
        timeReadingMicros: 100_000,
      }),
    ).map((f) => f.id);
    expect(quiet).not.toContain("planning-time");
    expect(quiet).not.toContain("storage-read");
  });

  it("order findings by severity", () => {
    for (const entry of entries) {
      const severities = analyzeEntry(entry).map((f) => f.severity);
      const rank = { critical: 0, warning: 1, info: 2 };
      for (let i = 1; i < severities.length; i++) {
        expect(rank[severities[i - 1]!]).toBeLessThanOrEqual(
          rank[severities[i]!],
        );
      }
    }
  });
});

describe("group analyzers", () => {
  it("flag the group that dominates cumulative time", () => {
    const groups = groupEntries(entries, groupDimensionById("command"));
    const dominant = groups.filter((g) => g.stats.timeShare! >= 0.25);
    expect(dominant.length).toBeGreaterThan(0);
    for (const group of groups) {
      const has = analyzeGroup(group).some(
        (f) => f.id === "dominant-time-share",
      );
      expect(has).toBe(group.stats.timeShare! >= 0.25);
    }
  });

  it("flag shapes that always collection scan, once they recur", () => {
    const groups = groupEntries(entries, groupDimensionById("shape"));
    const flagged = groups.filter((g) =>
      analyzeGroup(g).some((f) => f.id === "consistently-unindexed"),
    );
    expect(flagged.length).toBeGreaterThan(0);
    expect(flagged.length).toBeLessThan(groups.length);
    for (const group of groups) {
      const { count, collectionScanCount } = group.stats;
      expect(flagged.includes(group), group.label).toBe(
        count >= 3 && collectionScanCount === count,
      );
    }
  });
});

describe("workload analyzers", () => {
  it("produce findings for the fixture workload and none for an empty one", () => {
    const summary = summarizeWorkload(entries);
    const findings = analyzeWorkload({ entries, summary });
    expect(findings.every((f) => f.layer === "workload")).toBe(true);
    expect(
      analyzeWorkload({ entries: [], summary: summarizeWorkload([]) }),
    ).toEqual([]);
  });
});
