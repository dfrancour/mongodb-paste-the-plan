import { describe, it, expect } from "vitest";
import { inMemorySort } from "./in_memory_sort";
import { createMockNormalizedStage } from "../test-helpers";
import type { PlanInput } from "../types";
import type { NormalizedStage } from "#types/explain-plan";
import { StageCategory } from "#data/stages/types";

function createPlanInput(
  overrides: Partial<PlanInput> & { allStages?: NormalizedStage[] } = {},
): PlanInput {
  const rootStage =
    overrides.rootStage ??
    createMockNormalizedStage({ id: "root", stage: "ROOT" });
  return {
    explainPlan: overrides.explainPlan ?? ({} as PlanInput["explainPlan"]),
    rootStage,
    allStages: overrides.allStages ?? [rootStage],
    esrAnalysis: overrides.esrAnalysis,
  };
}

describe("inMemorySort", () => {
  it("detects in-memory sort via totalDataSizeSorted", () => {
    const sortStage = createMockNormalizedStage({
      id: "sort-1",
      stage: "SORT",
      category: StageCategory.Sort,
      metrics: { totalDataSizeSorted: 5566 },
    });
    const input = createPlanInput({
      allStages: [sortStage],
    });

    const findings = inMemorySort.analyze(input);

    expect(findings.length).toBe(1);
    expect(findings[0]!.severity).toBe("info");
    expect(findings[0]!.category).toBe("performance");
    expect(findings[0]!.affectedStageIds).toContain("sort-1");
    expect(findings[0]!.metadata?.sortStageCount).toBe(1);
    expect(findings[0]!.metadata?.usedDisk).toBe(false);
  });

  it("detects in-memory sort via memLimit", () => {
    const sortStage = createMockNormalizedStage({
      id: "sort-1",
      stage: "SORT",
      category: StageCategory.Sort,
      metrics: { memLimit: 104857600 },
    });
    const input = createPlanInput({
      allStages: [sortStage],
    });

    const findings = inMemorySort.analyze(input);
    expect(findings.length).toBe(1);
  });

  it("detects in-memory sort via totalDataSizeSortedBytesEstimate", () => {
    const sortStage = createMockNormalizedStage({
      id: "sort-1",
      stage: "$sort",
      category: StageCategory.Sort,
      metrics: { totalDataSizeSortedBytesEstimate: 1024 },
    });
    const input = createPlanInput({
      allStages: [sortStage],
    });

    const findings = inMemorySort.analyze(input);
    expect(findings.length).toBe(1);
  });

  it("detects usedDisk=false with memLimit as in-memory sort", () => {
    const sortStage = createMockNormalizedStage({
      id: "sort-1",
      stage: "SORT",
      category: StageCategory.Sort,
      metrics: { usedDisk: false, memLimit: 0 },
    });
    const input = createPlanInput({
      allStages: [sortStage],
    });

    const findings = inMemorySort.analyze(input);
    expect(findings.length).toBe(1);
  });

  it("escalates to warning when usedDisk is true", () => {
    const sortStage = createMockNormalizedStage({
      id: "sort-1",
      stage: "SORT",
      category: StageCategory.Sort,
      metrics: {
        totalDataSizeSorted: 500000000,
        usedDisk: true,
        memLimit: 104857600,
      },
    });
    const input = createPlanInput({
      allStages: [sortStage],
    });

    const findings = inMemorySort.analyze(input);

    expect(findings.length).toBe(1);
    expect(findings[0]!.severity).toBe("warning");
    expect(findings[0]!.title).toContain("Spilled to Disk");
  });

  it("returns no findings when no sort stages exist", () => {
    const fetchStage = createMockNormalizedStage({
      id: "fetch-1",
      stage: "FETCH",
      category: StageCategory.Fetch,
      metrics: {},
    });
    const input = createPlanInput({
      allStages: [fetchStage],
    });

    const findings = inMemorySort.analyze(input);
    expect(findings.length).toBe(0);
  });

  it("returns no findings for sort stages without sort indicators", () => {
    const sortStage = createMockNormalizedStage({
      id: "sort-1",
      stage: "SORT",
      category: StageCategory.Sort,
      metrics: {}, // No totalDataSizeSorted, memLimit, etc.
    });
    const input = createPlanInput({
      allStages: [sortStage],
    });

    const findings = inMemorySort.analyze(input);
    expect(findings.length).toBe(0);
  });

  it("detects multiple in-memory sort stages", () => {
    const sort1 = createMockNormalizedStage({
      id: "sort-1",
      stage: "SORT",
      category: StageCategory.Sort,
      metrics: { totalDataSizeSorted: 1000 },
    });
    const sort2 = createMockNormalizedStage({
      id: "sort-2",
      stage: "$sort",
      category: StageCategory.Sort,
      metrics: { memLimit: 104857600 },
    });
    const input = createPlanInput({
      allStages: [sort1, sort2],
    });

    const findings = inMemorySort.analyze(input);

    expect(findings.length).toBe(1);
    expect(findings[0]!.metadata?.sortStageCount).toBe(2);
    expect(findings[0]!.affectedStageIds).toContain("sort-1");
    expect(findings[0]!.affectedStageIds).toContain("sort-2");
  });
});
