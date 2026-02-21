import { describe, it, expect } from "vitest";
import { PlanParser } from "./planParser";
import {
  loadTestPlan,
  loadTestFixture,
  findDeepestStages,
} from "#test-utils/test-helpers";
import { StageCategory } from "#data/stages/types";

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

  it("should insert SHARD_EXECUTION nodes between SHARD_MERGE and per-shard stages", () => {
    const shardedPlan = loadTestFixture("sharded-query.json");
    const parsed = PlanParser.parse(shardedPlan);
    const normalized = PlanParser.normalizeExecution(parsed);

    // Children of SHARD_MERGE should be SHARD_EXECUTION nodes
    expect(normalized.children.length).toBe(2);
    for (const child of normalized.children) {
      expect(child.stage).toBe("SHARD_EXECUTION");
      expect(child.depth).toBe(1);
      // Each SHARD_EXECUTION should have the actual shard execution stages as children
      expect(child.children.length).toBe(1);
      expect(child.children[0]!.stage).toBe("SHARDING_FILTER");
      expect(child.children[0]!.depth).toBe(2);
    }
  });

  it("should populate shardName on SHARD_EXECUTION nodes", () => {
    const shardedPlan = loadTestFixture("sharded-query.json");
    const parsed = PlanParser.parse(shardedPlan);
    const normalized = PlanParser.normalizeExecution(parsed);

    const shardNames = normalized.children.map((child) => child.shardName);
    expect(shardNames).toEqual(["shard01", "shard02"]);
  });

  it("should populate executionSuccess on SHARD_EXECUTION nodes", () => {
    const shardedPlan = loadTestFixture("sharded-query.json");
    const parsed = PlanParser.parse(shardedPlan);
    const normalized = PlanParser.normalizeExecution(parsed);

    for (const child of normalized.children) {
      expect(child.executionSuccess).toBe(true);
    }
  });

  it("should populate shard-level metrics on SHARD_EXECUTION nodes", () => {
    const shardedPlan = loadTestFixture("sharded-query.json");
    const parsed = PlanParser.parse(shardedPlan);
    const normalized = PlanParser.normalizeExecution(parsed);

    // shard01: executionTimeMillis=85, nReturned=23456, totalKeysExamined=26000, totalDocsExamined=23500
    const shard01 = normalized.children[0]!;
    expect(shard01.metrics.executionTimeMillis).toBe(85);
    expect(shard01.metrics.nReturned).toBe(23456);
    expect(shard01.metrics.keysExamined).toBe(26000);
    expect(shard01.metrics.docsExamined).toBe(23500);

    // shard02: executionTimeMillis=78, nReturned=22222, totalKeysExamined=26000, totalDocsExamined=22500
    const shard02 = normalized.children[1]!;
    expect(shard02.metrics.executionTimeMillis).toBe(78);
    expect(shard02.metrics.nReturned).toBe(22222);
    expect(shard02.metrics.keysExamined).toBe(26000);
    expect(shard02.metrics.docsExamined).toBe(22500);
  });

  it("should use fallback shard name when shardName is missing", () => {
    const shardedPlan = loadTestFixture("sharded-query.json");
    // Remove shardName from first shard to test fallback
    const modified = JSON.parse(JSON.stringify(shardedPlan)) as Record<
      string,
      unknown
    >;
    const execStats = modified.executionStats as Record<string, unknown>;
    const execStages = execStats.executionStages as Record<string, unknown>;
    const shards = execStages.shards as Record<string, unknown>[];
    delete shards[0]!.shardName;

    const parsed = PlanParser.parse(modified);
    const normalized = PlanParser.normalizeExecution(parsed);

    expect(normalized.children[0]!.shardName).toBe("shard0");
    expect(normalized.children[1]!.shardName).toBe("shard02");
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

  it("should resolve mongos stage icons and categories in execution view", () => {
    const shardedPlan = loadTestFixture("sharded-query.json");
    const parsed = PlanParser.parse(shardedPlan);
    const normalized = PlanParser.normalizeExecution(parsed);

    // Root SHARD_MERGE should have its mongos-layer icon, not the fallback
    expect(normalized.stage).toBe("SHARD_MERGE");
    expect(normalized.iconName).toBe("Merge");
    expect(normalized.category).toBe(StageCategory.Internal);

    // SHARD_EXECUTION nodes should have Server icon
    for (const child of normalized.children) {
      expect(child.stage).toBe("SHARD_EXECUTION");
      expect(child.iconName).toBe("Server");
      expect(child.category).toBe(StageCategory.Internal);
    }
  });

  it("should resolve mongos stage icons and categories in planning view", () => {
    const shardedPlan = loadTestFixture("sharded-query.json");
    const parsed = PlanParser.parse(shardedPlan);
    const normalized = PlanParser.normalizePlan(parsed);

    // Root stage in planning view should also resolve mongos icons
    expect(normalized.iconName).not.toBe("CircleQuestionMark");
    expect(normalized.category).not.toBe(StageCategory.Unknown);
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
