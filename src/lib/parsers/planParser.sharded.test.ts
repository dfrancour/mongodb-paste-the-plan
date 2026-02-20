import { describe, it, expect } from "vitest";
import { PlanParser } from "./planParser";
import {
  loadTestPlan,
  loadTestFixture,
  findDeepestStages,
} from "#test-utils/test-helpers";

describe("Sharded Query Parsing Completeness", () => {
  it("should extract execution stages from all shards, not just root SHARD_MERGE", () => {
    const shardedPlan = loadTestFixture("sharded-query.json");
    const parsed = PlanParser.parse(shardedPlan);
    const normalized = PlanParser.normalizeExecution(parsed);

    // Behavioral expectation: Multi-shard queries should show more than just SHARD_MERGE
    expect(normalized.stage).toBe("SHARD_MERGE");
    expect(normalized.children.length).toBeGreaterThan(0);

    // Should find nested stages within shards (SHARDING_FILTER, FETCH, IXSCAN)
    const deepStages = findDeepestStages(normalized);
    const hasNestedStages = deepStages.some(
      (stage) => stage.depth > 1 && stage.stage !== "SHARD_MERGE",
    );
    expect(hasNestedStages).toBe(true);

    // Should have stages at multiple levels (not just depth 0 and 1)
    const allDepths = new Set<number>();
    function collectDepths(stage: typeof normalized) {
      allDepths.add(stage.depth);
      stage.children.forEach(collectDepths);
    }
    collectDepths(normalized);

    expect(allDepths.size).toBeGreaterThan(2); // At least 3 levels of depth
  });

  it("should preserve shard-specific metrics during parsing", () => {
    const shardedPlan = loadTestFixture("sharded-query.json");
    const parsed = PlanParser.parse(shardedPlan);
    const normalized = PlanParser.normalizeExecution(parsed);

    // Behavioral expectation: Should preserve individual shard performance data
    let totalChildMetrics = 0;
    normalized.children.forEach((child) => {
      if (child.metrics.nReturned !== undefined) {
        totalChildMetrics += child.metrics.nReturned;
      }
    });

    // Child shards should have meaningful metrics
    expect(totalChildMetrics).toBeGreaterThan(0);

    // Root SHARD_MERGE should aggregate metrics
    expect(normalized.metrics.nReturned).toBeGreaterThanOrEqual(
      totalChildMetrics,
    );
  });

  it("should handle sharded queries without execution stats gracefully", () => {
    // Test with queryPlanner-only sharded plan (edge case)
    const shardedPlan = loadTestFixture("sharded-query.json");

    // Remove executionStats to simulate queryPlanner-only format
    const plannerOnly = {
      ...(shardedPlan as object),
      executionStats: undefined,
    };

    // Behavioral expectation: Should parse without throwing
    expect(() => {
      const parsed = PlanParser.parse(plannerOnly);
      const normalized = PlanParser.normalizePlan(parsed);
      expect(normalized.stage).toBeDefined();
    }).not.toThrow();
  });

  it("should identify sharded queries correctly from plan structure", () => {
    const testCases = [
      { path: "sharded-query.json", isSharded: true, useFixture: true },
      {
        path: "basic/simple-index-scan.executionStats.json",
        isSharded: false,
        useFixture: false,
      },
      {
        path: "complex/or-operation.executionStats.json",
        isSharded: false,
        useFixture: false,
      },
    ];

    testCases.forEach(({ path, isSharded, useFixture }) => {
      const plan = useFixture ? loadTestFixture(path) : loadTestPlan(path);
      const parsed = PlanParser.parse(plan);
      const normalized = PlanParser.normalizeExecution(parsed);

      // Behavioral expectation: Sharded queries should have SHARD_MERGE at root
      const hasShardMerge = normalized.stage === "SHARD_MERGE";
      expect(hasShardMerge).toBe(isSharded);
    });
  });
});
