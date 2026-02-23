import { describe, it, expect } from "vitest";
import { coveredQueryOptimal } from "./covered_query_optimal";
import type { StageDefinitionInput } from "../types";
import { StageCategory, StageIds } from "#data/stages/types";

describe("coveredQueryOptimal", () => {
  it("detects covered query indicators", () => {
    const input: StageDefinitionInput = {
      definition: {
        layer: "execution",
        engine: "classic",
        id: StageIds.execution("PROJECTION_COVERED"),
        fullName: "Covered Projection",
        description: "test",
        category: StageCategory.Transformation,
        iconName: "Layers",
        blockingStage: false,
        canSpillToDisk: false,
        isCoveredQueryIndicator: true,
        explainFields: [],
      },
      stageId: "stage-1",
    };

    const findings = coveredQueryOptimal.analyze(input);

    expect(findings.length).toBe(1);
    expect(findings[0]!.severity).toBe("info");
    expect(findings[0]!.category).toBe("optimization");
  });
});
