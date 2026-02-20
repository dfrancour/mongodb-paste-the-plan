import { describe, it, expect } from "vitest";
import { joinWarning } from "./join_warning";
import type { StageDefinitionInput } from "../types";
import { StageCategory, StageIds } from "#data/stages/types";

describe("joinWarning", () => {
  it("detects join stages", () => {
    const input: StageDefinitionInput = {
      definition: {
        layer: "pipeline",
        id: StageIds.pipeline("$lookup"),
        fullName: "$lookup",
        description: "test",
        category: StageCategory.Join,
        iconName: "Link",
        analysisNote: "Expensive for large collections",
      },
      stageId: "lookup-1",
    };

    const findings = joinWarning.analyze(input);

    expect(findings.length).toBe(1);
    expect(findings[0]!.severity).toBe("warning");
    expect(findings[0]!.category).toBe("performance");
    expect(findings[0]!.affectedStageIds).toContain("lookup-1");
    expect(findings[0]!.metadata?.analysisNote).toBe(
      "Expensive for large collections",
    );
  });

  it("does not flag non-join stages", () => {
    const input: StageDefinitionInput = {
      definition: {
        layer: "pipeline",
        id: StageIds.pipeline("$match"),
        fullName: "$match",
        description: "test",
        category: StageCategory.Filter,
        iconName: "Filter",
      },
      stageId: "match-1",
    };

    const findings = joinWarning.analyze(input);
    expect(findings.length).toBe(0);
  });
});
