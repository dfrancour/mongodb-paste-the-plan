import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import { loadSlowQueryLog } from "./parse/loadSlowQueryLog";

/** The server's default slow threshold; the example log is captured at it. */
const SLOW_THRESHOLD_MS = 100;

describe("the example log the app serves", () => {
  const text = fs.readFileSync(
    path.join(process.cwd(), "public", "examples", "slow-query-log.jsonl"),
    "utf-8",
  );
  const result = loadSlowQueryLog(text);

  it("loads every line as a slow-query entry", () => {
    expect(result.invalidLines).toEqual([]);
    expect(result.skipped).toEqual({
      notSlowQuery: 0,
      notAnObject: 0,
      malformed: 0,
    });
    expect(result.entries.length).toBeGreaterThan(50);
  });

  it("only holds operations over the slow threshold", () => {
    for (const entry of result.entries) {
      expect(entry.metrics.durationMillis).toBeGreaterThanOrEqual(
        SLOW_THRESHOLD_MS,
      );
    }
  });

  it("covers the operation kinds the explorer distinguishes", () => {
    const seen = new Set(result.entries.map((e) => e.operation));
    for (const op of [
      "find",
      "aggregate",
      "getMore",
      "count",
      "distinct",
      "findAndModify",
      "update",
      "delete",
    ]) {
      expect(seen.has(op as never), op).toBe(true);
    }
  });

  it("spans several services", () => {
    const apps = new Set(result.entries.map((e) => e.appName));
    expect(apps.size).toBeGreaterThanOrEqual(4);
  });
});
