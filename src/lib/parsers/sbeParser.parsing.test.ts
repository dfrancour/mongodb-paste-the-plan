import { describe, it, expect } from "vitest";
import { PlanParser } from "./planParser";
import { loadTestPlan } from "#test-utils/test-helpers";

describe("SBE Plan Parsing", () => {
  it("should correctly parse SBE aggregation pipeline plan structure", () => {
    const explainPlan = loadTestPlan(
      "complex/aggregation-pipeline.executionStats.json",
    );

    // Verify it's an SBE plan
    expect(PlanParser.isSBEPlan(explainPlan)).toBe(true);

    // Parse the SBE plan
    const sbePlan = PlanParser.extractSBEPlan(explainPlan);
    expect(sbePlan).toBeTruthy();

    if (!sbePlan) return;

    // Check that we get individual stages
    expect(sbePlan.stages.length).toBeGreaterThan(1);

    // Verify we have the expected stage types from the plan
    const stageTypes = sbePlan.stages.map((s) => s.stageType);

    // Verify we have the expected stage types from the plan
    expect(stageTypes).toContain("project");
    expect(stageTypes).toContain("nlj");
    expect(stageTypes).toContain("ixseek"); // We actually get ixseek, not ixscan_generic
    expect(stageTypes).toContain("seek");
    expect(stageTypes).toContain("limit");
    expect(stageTypes).toContain("coscan");
    expect(stageTypes).toContain("branch");

    // Check that stages have proper node IDs
    const nodeIds = sbePlan.stages.map((s) => s.nodeId);
    expect(nodeIds).toContain(1); // planNodeId 1
    expect(nodeIds).toContain(2); // planNodeId 2
    expect(nodeIds).toContain(3); // planNodeId 3

    // Verify slot environment is parsed
    expect(sbePlan.slotEnvironment).toBeTruthy();
    expect(sbePlan.slotEnvironment.resultSlot).toBe("s24");

    // Verify slot lineages are built
    expect(sbePlan.slotLineages.length).toBeGreaterThan(0);
  });

  it("should create proper dependencies for bottom-to-top flow", () => {
    const explainPlan = loadTestPlan(
      "complex/aggregation-pipeline.executionStats.json",
    );
    const sbePlan = PlanParser.extractSBEPlan(explainPlan);

    if (!sbePlan) throw new Error("Failed to parse SBE plan");

    // Verify queryPlan stage names are extracted
    expect(sbePlan.queryPlanStages.size).toBeGreaterThan(0);

    // Check that we have actual MongoDB stage names instead of hardcoded guesses
    const stageNames = Array.from(sbePlan.queryPlanStages.values());
    expect(
      stageNames.some((name) =>
        ["IXSCAN", "FETCH", "SORT", "PROJECTION_DEFAULT"].includes(name),
      ),
    ).toBe(true);

    // Each stage should have proper slot references
    sbePlan.stages.forEach((stage) => {
      expect(Array.isArray(stage.slotReferences)).toBe(true);
    });
  });

  it("should extract queryPlan stage names from various SBE test plans", () => {
    const testPlans = [
      "performance/sort-with-index.executionStats.json",
      "complex/aggregation-pipeline.executionStats.json",
    ];

    testPlans.forEach((planPath) => {
      const explainPlan = loadTestPlan(planPath);
      const sbePlan = PlanParser.extractSBEPlan(explainPlan);

      expect(sbePlan).toBeTruthy();
      if (!sbePlan) return;

      // Should have queryPlan stage names
      expect(sbePlan.queryPlanStages.size).toBeGreaterThan(0);

      // Stage names should be real MongoDB stage names, not generic NODE_X
      const stageNames = Array.from(sbePlan.queryPlanStages.values());
      const hasRealStageNames = stageNames.some(
        (name) => !name.startsWith("NODE_"),
      );
      expect(hasRealStageNames).toBe(true);
    });
  });
});
