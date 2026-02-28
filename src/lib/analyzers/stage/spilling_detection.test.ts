import { describe, it, expect } from "vitest";
import { spillingDetection } from "./spilling_detection";
import type { NormalizedExecutionStage } from "#types/explain-plan";
import type { StageInput } from "../types";
import { StageIds, StageCategory } from "#data/stages/types";
import type { ExecutionStage } from "#data/stages/types";

function makeSortDefinition(): ExecutionStage {
  return {
    layer: "execution",
    engine: "classic",
    id: StageIds.execution("SORT"),
    fullName: "In-Memory Sort",
    description: "Sorts documents in memory",
    category: StageCategory.Sort,
    iconName: "SortAsc",
    blockingStage: true,
    canSpillToDisk: true,
  } as ExecutionStage;
}

function makeStage(
  overrides: Partial<NormalizedExecutionStage>,
): NormalizedExecutionStage {
  return {
    id: "root.0",
    stage: "SORT",
    category: StageCategory.Sort,
    iconName: "SortAsc",
    definition: makeSortDefinition(),
    structure: {},
    metrics: {},
    children: [],
    depth: 1,
    ...overrides,
  } as NormalizedExecutionStage;
}

function makeInput(stage: NormalizedExecutionStage): StageInput {
  return { stage };
}

describe("spillingDetection", () => {
  it("produces critical finding when usedDisk is true", () => {
    const stage = makeStage({
      metrics: { usedDisk: true },
    });
    const findings = spillingDetection.analyze(makeInput(stage));
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("critical");
    expect(findings[0]!.title).toBe("Stage Spilled to Disk");
  });

  it("includes spill details from metrics", () => {
    const stage = makeStage({
      metrics: { usedDisk: true, spills: 3, spilledBytes: 5242880 },
    });
    const findings = spillingDetection.analyze(makeInput(stage));
    expect(findings).toHaveLength(1);
    expect(findings[0]!.description).toContain("3 spill(s)");
    expect(findings[0]!.description).toContain("5.0MB spilled");
  });

  it("produces warning when spills > 0 without usedDisk", () => {
    const stage = makeStage({
      metrics: { spills: 2 },
    });
    const findings = spillingDetection.analyze(makeInput(stage));
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("warning");
  });

  it("produces info finding for high memory pressure", () => {
    const stage = makeStage({
      metrics: {
        memLimit: 104857600, // 100MB
        totalDataSizeSorted: 92274688, // ~88MB = 88% pressure
      },
    });
    const findings = spillingDetection.analyze(makeInput(stage));
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("info");
    expect(findings[0]!.title).toBe("High Memory Pressure");
  });

  it("produces no findings for low memory usage", () => {
    const stage = makeStage({
      metrics: {
        memLimit: 104857600, // 100MB
        totalDataSizeSorted: 10485760, // 10MB = 10%
      },
    });
    const findings = spillingDetection.analyze(makeInput(stage));
    expect(findings).toHaveLength(0);
  });

  it("ignores stages that cannot spill to disk", () => {
    const nonSpillDef = {
      ...makeSortDefinition(),
      canSpillToDisk: false,
    } as ExecutionStage;
    const stage = makeStage({
      definition: nonSpillDef,
      metrics: { usedDisk: true },
    });
    const findings = spillingDetection.analyze(makeInput(stage));
    expect(findings).toHaveLength(0);
  });

  it("ignores plan stages without metrics", () => {
    const stage = {
      id: "root",
      stage: "SORT",
      category: StageCategory.Sort,
      iconName: "SortAsc",
      structure: {},
      children: [],
      depth: 0,
    };
    const findings = spillingDetection.analyze({
      stage: stage as unknown as NormalizedExecutionStage,
    });
    expect(findings).toHaveLength(0);
  });
});
