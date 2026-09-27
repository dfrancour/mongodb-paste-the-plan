import { describe, it, expect } from "vitest";
import { loadSlowQueryLog } from "../parse/loadSlowQueryLog";
import { groupDimensionById } from "../group/dimensions";
import { groupEntries } from "../group/groupEntries";
import { DEFAULT_GROUP_SORT, sortGroups } from "./sortGroups";
import { loadSlowQueryLogFixture } from "#test-utils/slow-query-fixtures";

const { entries } = loadSlowQueryLog(
  loadSlowQueryLogFixture("6.0/standalone/slow-queries.jsonl"),
);
const groups = groupEntries(entries, groupDimensionById("command"));

describe("sortGroups", () => {
  it("puts the heaviest group first by default", () => {
    const sorted = sortGroups(groups, DEFAULT_GROUP_SORT);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1]!.stats.durationTotal!).toBeGreaterThanOrEqual(
        sorted[i]!.stats.durationTotal!,
      );
    }
  });

  it("sorts unknown metrics last in both directions", () => {
    const mixed = groups.map((g, i) =>
      i % 2 === 0 ? g : { ...g, stats: { ...g.stats, durationAvg: undefined } },
    );
    for (const direction of ["asc", "desc"] as const) {
      const sorted = sortGroups(mixed, { key: "durationAvg", direction });
      const firstUnknown = sorted.findIndex(
        (g) => g.stats.durationAvg === undefined,
      );
      expect(firstUnknown).toBeGreaterThan(0);
      expect(
        sorted
          .slice(firstUnknown)
          .every((g) => g.stats.durationAvg === undefined),
      ).toBe(true);
    }
  });

  it("sorts labels alphabetically", () => {
    const labels = sortGroups(groups, { key: "label", direction: "asc" }).map(
      (g) => g.label,
    );
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
  });
});
