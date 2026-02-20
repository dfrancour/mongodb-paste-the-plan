import { describe, it, expect } from "vitest";
import { loadTestPlan } from "#test-utils/test-helpers";

// Type definition for aggregation pipeline stages
type AggregationStage = {
  $cursor?: {
    executionStats?: {
      nReturned?: number;
      executionTimeMillis?: number;
      totalKeysExamined?: number;
      totalDocsExamined?: number;
    };
  };
  nReturned?: number;
  executionTimeMillisEstimate?: number;
  [key: string]: unknown;
};

describe("FlowVisualization Aggregation Pipeline Logic", () => {
  it("should correctly identify aggregation pipeline vs regular query", () => {
    const aggPlan = loadTestPlan(
      "complex/aggregation-pipeline.allPlansExecution.json",
    );
    const isAggregationPipeline =
      aggPlan.stages &&
      Array.isArray(aggPlan.stages) &&
      aggPlan.stages.length > 0;
    expect(isAggregationPipeline).toBe(true);

    const queryPlan = loadTestPlan(
      "basic/simple-index-scan.executionStats.json",
    );
    expect(queryPlan.stages).toBeUndefined();
    expect(queryPlan.executionStats).toBeDefined();
  });

  it("should extract correct metrics from aggregation pipeline structure", () => {
    const plan = loadTestPlan(
      "complex/aggregation-pipeline.allPlansExecution.json",
    );

    // Test the extraction logic that would be used in FlowVisualization
    const extractAggregationStats = () => {
      if (!plan.stages || plan.stages.length === 0) {
        return {
          nReturned: 0,
          executionTimeMillis: 0,
          totalKeysExamined: 0,
          totalDocsExamined: 0,
        };
      }

      // Type-safe access to stages with proper type assertion
      const stages = plan.stages as AggregationStage[];

      // Get final stage for overall nReturned (result of entire pipeline)
      const finalStage = stages[stages.length - 1];
      const finalNReturned = finalStage?.nReturned ?? 0;
      const finalExecutionTime = finalStage?.executionTimeMillisEstimate ?? 0;

      // Get $cursor stage for query execution metrics (keys/docs examined)
      const cursorStage = stages[0]?.$cursor;
      const cursorStats = cursorStage?.executionStats;

      return {
        nReturned: finalNReturned,
        executionTimeMillis: Math.max(
          finalExecutionTime,
          cursorStats?.executionTimeMillis ?? 0,
        ),
        totalKeysExamined: cursorStats?.totalKeysExamined ?? 0,
        totalDocsExamined: cursorStats?.totalDocsExamined ?? 0,
      };
    };

    const stats = extractAggregationStats();

    // Should extract final stage nReturned (10 from $sort with limit)
    expect(stats.nReturned).toBe(10);

    // Should extract cursor stage metrics
    expect(stats.totalKeysExamined).toBe(2143);
    expect(stats.totalDocsExamined).toBe(2126);

    // Should get execution time (7ms from final stage vs 6ms from cursor)
    expect(stats.executionTimeMillis).toBe(7);
  });
});
