import { describe, it, expect } from "vitest";
import { validatePlan } from "#lib/parsers";
import { loadTestPlan } from "#test-utils/test-helpers";

describe("Aggregation Pipeline Stats Extraction", () => {
  it("should correctly extract nReturned from aggregation pipeline final stage", () => {
    const plan = loadTestPlan(
      "complex/aggregation-pipeline.allPlansExecution.json",
    );

    // Parse the plan
    const parsedPlan = validatePlan(plan);
    expect(parsedPlan).toBeTruthy();

    expect(plan.stages).toBeDefined();
    expect(Array.isArray(plan.stages)).toBe(true);
    expect(plan.stages?.length).toBe(5); // $cursor, $addFields, $match, $group, $sort

    // Verify the final stage has the expected nReturned value
    const stages = plan.stages!;
    const finalStage = stages[stages.length - 1];
    expect(finalStage).toBeDefined();
    expect(finalStage?.nReturned).toBe(10); // Final $sort stage with limit: 10
    expect(finalStage?.executionTimeMillisEstimate).toBe(7);

    // Verify the $cursor stage has query execution metrics
    const cursorStage = stages[0];
    expect(cursorStage?.$cursor).toBeDefined();
    expect(cursorStage?.$cursor?.executionStats).toBeDefined();
    expect(cursorStage?.$cursor?.executionStats?.nReturned).toBe(2126);
    expect(cursorStage?.$cursor?.executionStats?.totalKeysExamined).toBe(2143);
    expect(cursorStage?.$cursor?.executionStats?.totalDocsExamined).toBe(2126);
  });

  it("should handle type safety for aggregation pipeline stages", () => {
    const plan = loadTestPlan(
      "complex/aggregation-pipeline.allPlansExecution.json",
    );

    // Verify the schema can parse this plan without type errors
    expect(() => validatePlan(plan)).not.toThrow();

    const stages = plan.stages!;

    // First stage should be $cursor
    expect(stages[0]?.$cursor).toBeDefined();
    expect(typeof stages[0]?.nReturned).toBe("number");

    // Subsequent stages should have pipeline operators
    expect(stages[1]?.$addFields).toBeDefined();
    expect(typeof stages[1]?.nReturned).toBe("number");

    expect(stages[2]?.$match).toBeDefined();
    expect(typeof stages[2]?.nReturned).toBe("number");

    expect(stages[3]?.$group).toBeDefined();
    expect(typeof stages[3]?.nReturned).toBe("number");

    expect(stages[4]?.$sort).toBeDefined();
    expect(typeof stages[4]?.nReturned).toBe("number");
  });

  it("should validate aggregation stage schema correctly", () => {
    // Test that our updated schema handles various stage types
    const cursorStage = {
      $cursor: {
        queryPlanner: { namespace: "test.collection" },
        executionStats: { nReturned: 100, executionTimeMillis: 5 },
      },
      nReturned: 100,
      executionTimeMillisEstimate: 5,
    };

    const addFieldsStage = {
      $addFields: { computed_field: { $multiply: ["$field1", "$field2"] } },
      nReturned: 100,
      executionTimeMillisEstimate: 2,
    };

    const sortStage = {
      $sort: { sortKey: { field1: -1 }, limit: 10 },
      nReturned: 10,
      executionTimeMillisEstimate: 1,
    };

    // Create a mock aggregation pipeline
    const mockPlan = {
      explainVersion: "2",
      stages: [cursorStage, addFieldsStage, sortStage],
      serverInfo: { version: "8.0.0" },
    };

    // Should parse without throwing
    expect(() => validatePlan(mockPlan)).not.toThrow();
  });
});
