import { describe, it, expect } from "vitest";
import { validatePlan } from "#lib/parsers";
import { loadTestPlan } from "#test-utils/test-helpers";

describe("Aggregation Pipeline Parsing", () => {
  it("should correctly parse all real aggregation pipeline test files", () => {
    const aggregationFiles = [
      "complex/aggregation-pipeline.queryPlanner.json",
      "complex/aggregation-pipeline.executionStats.json",
      "complex/aggregation-pipeline.allPlansExecution.json",
    ];

    aggregationFiles.forEach((planPath) => {
      const plan = loadTestPlan(planPath);

      // Should parse without throwing
      expect(() => validatePlan(plan)).not.toThrow();

      // Should be recognized as explainVersion "2" (SBE)
      expect(plan.explainVersion).toBe("2");

      // Should have stages array
      expect(plan.stages).toBeDefined();
      expect(Array.isArray(plan.stages)).toBe(true);
      expect(plan.stages?.length).toBeGreaterThan(0);
    });
  });

  it("should extract correct metrics from different aggregation formats", () => {
    // Test executionStats format
    const execStatsPlan = loadTestPlan(
      "complex/aggregation-pipeline.executionStats.json",
    );
    const execStages = execStatsPlan.stages!;

    expect(execStatsPlan.stages).toBeDefined();
    expect(execStages.length).toBe(5);

    // Final stage should have nReturned: 10
    const finalStage = execStages[execStages.length - 1];
    expect(finalStage?.nReturned).toBe(10);

    // Test allPlansExecution format
    const allPlansPlan = loadTestPlan(
      "complex/aggregation-pipeline.allPlansExecution.json",
    );
    const allStages = allPlansPlan.stages!;

    // Should have same structure
    expect(allStages[allStages.length - 1]?.nReturned).toBe(10);

    // Should have $cursor stage with execution stats
    const cursorStage = allStages[0];
    expect(cursorStage?.$cursor).toBeDefined();
    expect(cursorStage?.$cursor?.executionStats).toBeDefined();
    expect(cursorStage?.$cursor?.executionStats?.nReturned).toBe(2126);
  });

  it("should differentiate aggregation pipelines from regular queries", () => {
    const aggPlan = loadTestPlan(
      "complex/aggregation-pipeline.executionStats.json",
    );
    const queryPlan = loadTestPlan(
      "basic/simple-index-scan.executionStats.json",
    );

    // Aggregation should have stages array
    expect(aggPlan.stages).toBeDefined();
    expect(Array.isArray(aggPlan.stages)).toBe(true);

    // Regular query should have executionStats at top level
    expect(queryPlan.executionStats).toBeDefined();
    expect(queryPlan.stages).toBeUndefined();
  });

  it("should handle edge cases in aggregation pipeline parsing", () => {
    // Test with empty stages array
    const emptyStagesPlan = {
      explainVersion: "2",
      stages: [],
      serverInfo: { version: "8.0.0" },
    };

    expect(() => validatePlan(emptyStagesPlan)).not.toThrow();

    // Test with single stage
    const singleStagePlan = {
      explainVersion: "2",
      stages: [
        {
          $match: { field: "value" },
          nReturned: 100,
          executionTimeMillisEstimate: 5,
        },
      ],
      serverInfo: { version: "8.0.0" },
    };

    expect(() => validatePlan(singleStagePlan)).not.toThrow();
  });

  it("should preserve all aggregation stage metrics during parsing", () => {
    const plan = loadTestPlan(
      "complex/aggregation-pipeline.allPlansExecution.json",
    );

    // Parse the plan
    const parsedPlan = validatePlan(plan);

    // Verify original data is preserved in explainPlan
    expect(parsedPlan).toBeTruthy();

    const stages = plan.stages!;

    // Verify each stage type and its metrics are accessible
    expect(stages[0]?.$cursor?.executionStats?.nReturned).toBe(2126);
    expect(stages[1]?.$addFields).toBeDefined();
    expect(stages[1]?.nReturned).toBe(2126);
    expect(stages[2]?.$match).toBeDefined();
    expect(stages[2]?.nReturned).toBe(2045);
    expect(stages[3]?.$group).toBeDefined();
    expect(stages[3]?.nReturned).toBe(13);
    expect(stages[4]?.$sort).toBeDefined();
    expect(stages[4]?.nReturned).toBe(10);
  });
});
