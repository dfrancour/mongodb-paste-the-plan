import { describe, it, expect } from "vitest";
import { expensiveSort } from "./expensive_sort";
import { createMockNormalizedStage } from "../test-helpers";
import type { StageInput } from "../types";
import { StageCategory } from "#data/stages/types";

describe("expensiveSort", () => {
  it("detects critically slow sort (>= 1000ms)", () => {
    const input: StageInput = {
      stage: createMockNormalizedStage({
        id: "sort-1",
        stage: "SORT",
        category: StageCategory.Sort,
        metrics: {
          executionTimeMillis: 1500,
          totalDataSizeSorted: 50000000,
          memLimit: 104857600,
          usedDisk: false,
        },
      }),
    };

    const findings = expensiveSort.analyze(input);

    expect(findings.length).toBe(1);
    expect(findings[0]!.severity).toBe("critical");
    expect(findings[0]!.metricKey).toBe("executionTime");
    expect(findings[0]!.metadata?.executionTimeMs).toBe(1500);
    expect(findings[0]!.metadata?.totalDataSizeSorted).toBe(50000000);
  });

  it("detects warning-level sort (>= 100ms, < 1000ms)", () => {
    const input: StageInput = {
      stage: createMockNormalizedStage({
        id: "sort-1",
        stage: "SORT",
        category: StageCategory.Sort,
        metrics: { executionTimeMillis: 250 },
      }),
    };

    const findings = expensiveSort.analyze(input);

    expect(findings.length).toBe(1);
    expect(findings[0]!.severity).toBe("warning");
  });

  it("does not flag fast sorts (< 100ms)", () => {
    const input: StageInput = {
      stage: createMockNormalizedStage({
        stage: "SORT",
        category: StageCategory.Sort,
        metrics: { executionTimeMillis: 50 },
      }),
    };

    const findings = expensiveSort.analyze(input);
    expect(findings.length).toBe(0);
  });

  it("skips non-sort stages", () => {
    const input: StageInput = {
      stage: createMockNormalizedStage({
        stage: "FETCH",
        category: StageCategory.Fetch,
        metrics: { executionTimeMillis: 5000 },
      }),
    };

    const findings = expensiveSort.analyze(input);
    expect(findings.length).toBe(0);
  });

  it("skips sort stages without execution time", () => {
    const input: StageInput = {
      stage: createMockNormalizedStage({
        stage: "SORT",
        category: StageCategory.Sort,
        metrics: {},
      }),
    };

    const findings = expensiveSort.analyze(input);
    expect(findings.length).toBe(0);
  });
});
