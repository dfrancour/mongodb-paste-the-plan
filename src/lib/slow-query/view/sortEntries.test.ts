import { describe, it, expect } from "vitest";
import { loadSlowQueryLog } from "../parse/loadSlowQueryLog";
import {
  EMPTY_FILTER,
  facetValues,
  filterEntries,
  toggleFacetValue,
  type FilterContext,
} from "./filterEntries";
import { groupDimensionById } from "../group/dimensions";
import { parseDurationMs } from "./durationInput";
import { analyzeEntry } from "../analyzers";
import { entrySearchText } from "./searchText";
import { sortEntries, DEFAULT_ENTRY_SORT } from "./sortEntries";
import { loadSlowQueryLogFixture } from "#test-utils/slow-query-fixtures";

const { entries } = loadSlowQueryLog(
  loadSlowQueryLogFixture("6.0/standalone/slow-queries.jsonl"),
);

describe("sortEntries", () => {
  it("sorts unknown values last in both directions", () => {
    for (const direction of ["asc", "desc"] as const) {
      const sorted = sortEntries(entries, { key: "docsExamined", direction });
      const firstUnknown = sorted.findIndex(
        (e) => e.metrics.docsExamined === undefined,
      );
      expect(
        sorted
          .slice(firstUnknown)
          .every((e) => e.metrics.docsExamined === undefined),
      ).toBe(true);
    }
  });

  it("orders durations descending by default", () => {
    const sorted = sortEntries(entries, DEFAULT_ENTRY_SORT);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1]!.metrics.durationMillis!).toBeGreaterThanOrEqual(
        sorted[i]!.metrics.durationMillis!,
      );
    }
  });
});

const context: FilterContext = {
  searchTextOf: entrySearchText,
  analyzerIdsOf: (entry) =>
    new Set(analyzeEntry(entry).map((f) => f.analyzerId)),
};

describe("filterEntries", () => {
  it("returns everything for the empty filter", () => {
    expect(filterEntries(entries, EMPTY_FILTER, context)).toHaveLength(
      entries.length,
    );
  });

  it("does not match session noise", () => {
    expect(
      filterEntries(entries, { ...EMPTY_FILTER, search: "lsid" }, context),
    ).toHaveLength(0);
  });

  it("ORs values within a facet and ANDs across facets", () => {
    let filter = toggleFacetValue(EMPTY_FILTER, "command", "find", "find");
    filter = toggleFacetValue(filter, "command", "aggregate", "aggregate");
    const reads = filterEntries(entries, filter, context);
    expect(new Set(reads.map((e) => e.commandName))).toEqual(
      new Set(["find", "aggregate"]),
    );
    filter = toggleFacetValue(
      filter,
      "namespace",
      "shopdb.customers",
      "shopdb.customers",
    );
    const narrowed = filterEntries(entries, filter, context);
    expect(narrowed.length).toBeGreaterThan(0);
    expect(narrowed.length).toBeLessThan(reads.length);
    expect(narrowed.every((e) => e.namespace === "shopdb.customers")).toBe(
      true,
    );
    expect(
      filterEntries(entries, filter, context, { exceptFacet: "namespace" }),
    ).toHaveLength(reads.length);
  });

  it("toggles a facet value off again and drops empty facets", () => {
    const on = toggleFacetValue(EMPTY_FILTER, "command", "find", "find");
    expect(on.facets.get("command")?.get("find")).toBe("find");
    const off = toggleFacetValue(on, "command", "find", "find");
    expect(off.facets.has("command")).toBe(false);
  });

  it("applies thresholds and treats unknown metrics as failing", () => {
    const slow = filterEntries(
      entries,
      { ...EMPTY_FILTER, minDurationMs: 20, maxDurationMs: 60 },
      context,
    );
    expect(slow.length).toBeGreaterThan(0);
    for (const e of slow) {
      expect(e.metrics.durationMillis!).toBeGreaterThanOrEqual(20);
      expect(e.metrics.durationMillis!).toBeLessThanOrEqual(60);
    }
    const heavy = filterEntries(
      entries,
      { ...EMPTY_FILTER, minDocsExamined: 10_000, maxDocumentEfficiency: 0.01 },
      context,
    );
    expect(heavy.length).toBeGreaterThan(0);
    expect(heavy.every((e) => e.metrics.docsExamined! >= 10_000)).toBe(true);
  });

  it("keeps entries with any selected finding", () => {
    const scans = filterEntries(
      entries,
      {
        ...EMPTY_FILTER,
        findingAnalyzerIds: new Set(["entry:collection_scan"]),
      },
      context,
    );
    expect(scans.length).toBeGreaterThan(0);
    expect(
      scans.every((e) =>
        e.planSummaryStages.some((s) => s.stage === "COLLSCAN"),
      ),
    ).toBe(true);
  });

  it("applies a UTC time window", () => {
    const times = entries
      .map((e) => e.timestamp!.getTime())
      .sort((a, b) => a - b);
    const midpoint = new Date(times[Math.floor(times.length / 2)]!);
    const early = filterEntries(
      entries,
      { ...EMPTY_FILTER, timeWindow: { start: null, end: midpoint } },
      context,
    );
    const late = filterEntries(
      entries,
      { ...EMPTY_FILTER, timeWindow: { start: midpoint, end: null } },
      context,
    );
    expect(early.length).toBeGreaterThan(0);
    expect(late.length).toBeGreaterThan(0);
    expect(early.every((e) => e.timestamp! <= midpoint)).toBe(true);
    expect(late.every((e) => e.timestamp! >= midpoint)).toBe(true);
  });

  it("can exclude cursor batches", () => {
    const without = filterEntries(
      entries,
      { ...EMPTY_FILTER, includeCursorBatches: false },
      context,
    );
    expect(without.some((e) => e.flags.isCursorBatch)).toBe(false);
    expect(without.length).toBeLessThan(entries.length);
  });
});

describe("facetValues", () => {
  it("counts distinct values most frequent first", () => {
    const values = facetValues(entries, groupDimensionById("namespace"));
    expect(values.map((v) => v.key)).toContain("shopdb.orders");
    for (let i = 1; i < values.length; i++) {
      expect(values[i - 1]!.count).toBeGreaterThanOrEqual(values[i]!.count);
    }
    expect(values.reduce((n, v) => n + v.count, 0)).toBe(entries.length);
  });
});

describe("parseDurationMs", () => {
  it("reads bare milliseconds and unit suffixes", () => {
    expect(parseDurationMs("500")).toBe(500);
    expect(parseDurationMs("1.5s")).toBe(1500);
    expect(parseDurationMs(" 2 min ")).toBe(120_000);
    expect(parseDurationMs("1h")).toBe(3_600_000);
    expect(parseDurationMs("fast")).toBeUndefined();
    expect(parseDurationMs("")).toBeUndefined();
  });
});
