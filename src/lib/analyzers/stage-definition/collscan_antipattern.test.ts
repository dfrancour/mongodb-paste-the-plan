import { describe, it, expect } from "vitest";
import { collscanAntipattern } from "./collscan_antipattern";
import type { StageDefinitionInput } from "../types";
import { StageCategory, StageIds } from "#data/stages/types";

describe("collscanAntipattern", () => {
  it("detects collection scan stages", () => {
    const input: StageDefinitionInput = {
      definition: {
        layer: "execution",
        engine: "classic",
        id: StageIds.execution("COLLSCAN"),
        fullName: "Collection Scan",
        description: "test",
        category: StageCategory.CollectionScan,
        iconName: "FolderSearch",
        blockingStage: false,
        canSpillToDisk: false,
        explainFields: [],
      },
      stageId: "stage-1",
    };

    const findings = collscanAntipattern.analyze(input);

    expect(findings.length).toBe(1);
    expect(findings[0]!.severity).toBe("critical");
    expect(findings[0]!.category).toBe("indexUsage");
    expect(findings[0]!.affectedStageIds).toContain("stage-1");
  });

  it("does not flag non-collection-scan stages", () => {
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
        explainFields: [],
      },
      stageId: "stage-1",
    };

    const findings = collscanAntipattern.analyze(input);
    expect(findings.length).toBe(0);
  });
});
