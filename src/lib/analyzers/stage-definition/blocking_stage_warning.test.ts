import { describe, it, expect } from "vitest";
import { blockingStageWarning } from "./blocking_stage_warning";
import type { StageDefinitionInput } from "../types";
import { StageCategory, StageIds } from "#data/stages/types";

describe("blockingStageWarning", () => {
  it("detects blocking execution stages", () => {
    const input: StageDefinitionInput = {
      definition: {
        layer: "execution",
        engine: "classic",
        id: StageIds.execution("SORT"),
        fullName: "Sort",
        description: "test",
        category: StageCategory.Sort,
        iconName: "SortAsc",
        blockingStage: true,
        canSpillToDisk: true,
      },
      stageId: "sort-1",
    };

    const findings = blockingStageWarning.analyze(input);

    expect(findings.length).toBe(1);
    expect(findings[0]!.severity).toBe("info");
    expect(findings[0]!.category).toBe("performance");
    expect(findings[0]!.affectedStageIds).toContain("sort-1");
    expect(findings[0]!.metadata?.canSpillToDisk).toBe(true);
  });

  it("does not flag non-blocking stages", () => {
    const input: StageDefinitionInput = {
      definition: {
        layer: "execution",
        engine: "classic",
        id: StageIds.execution("IXSCAN"),
        fullName: "Index Scan",
        description: "test",
        category: StageCategory.IndexScan,
        iconName: "Search",
        blockingStage: false,
        canSpillToDisk: false,
      },
      stageId: "ix-1",
    };

    const findings = blockingStageWarning.analyze(input);
    expect(findings.length).toBe(0);
  });

  it("detects blocking pipeline stages via executionCharacteristics", () => {
    const input: StageDefinitionInput = {
      definition: {
        layer: "pipeline",
        id: StageIds.pipeline("$group"),
        fullName: "$group",
        description: "test",
        category: StageCategory.Aggregation,
        iconName: "Layers",
        executionCharacteristics: {
          blockingStage: true,
          canSpillToDisk: true,
        },
      },
      stageId: "group-1",
    };

    const findings = blockingStageWarning.analyze(input);

    expect(findings.length).toBe(1);
    expect(findings[0]!.severity).toBe("info");
    expect(findings[0]!.metadata?.canSpillToDisk).toBe(true);
  });
});
