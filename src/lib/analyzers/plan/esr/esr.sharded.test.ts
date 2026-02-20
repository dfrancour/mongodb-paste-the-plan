import { describe, it, expect } from "vitest";
import { extractQueryConditions, analyzeExplainPlan } from "#lib/analyzers";
import type { ExplainPlan } from "#types/explain-plan";
import shardedQueryFixture from "#test-utils/fixtures/sharded-query.json";
import shardedAggregationFixture from "#test-utils/fixtures/sharded-aggregation-plan.json";

describe("ESR Analyzer - Sharded Plan Support", () => {
  it("should extract query conditions from sharded plans", () => {
    const shardedPlan = shardedQueryFixture as unknown as ExplainPlan;

    const conditions = extractQueryConditions(shardedPlan);

    // Should find conditions from the sharded plan structure (may have duplicates from multiple shards)
    expect(conditions.length).toBeGreaterThanOrEqual(2);

    // Should find the equality condition on region
    const regionConditions = conditions.filter((c) => c.field === "region");
    expect(regionConditions.length).toBeGreaterThan(0);
    expect(regionConditions[0]?.type).toBe("equality");
    expect(regionConditions[0]?.operator).toBe("$eq");

    // Should find the range condition on timestamp
    const timestampConditions = conditions.filter(
      (c) => c.field === "timestamp",
    );
    expect(timestampConditions.length).toBeGreaterThan(0);
    // Should find both $gte and $lte for the timestamp range
    const gteCondition = timestampConditions.find((c) => c.operator === "$gte");
    const lteCondition = timestampConditions.find((c) => c.operator === "$lte");
    expect(gteCondition).toBeDefined();
    expect(gteCondition?.type).toBe("range");
    expect(lteCondition).toBeDefined();
    expect(lteCondition?.type).toBe("range");
  });

  it("should extract indexes from sharded plans", () => {
    const shardedPlan = shardedQueryFixture as unknown as ExplainPlan;

    const analyses = analyzeExplainPlan(shardedPlan);

    // Should find index analysis from the sharded plan
    expect(analyses).toHaveLength(1);

    const analysis = analyses[0]!;
    expect(analysis.indexName).toBe("region_1_timestamp_1");
    expect(analysis.keyPattern).toEqual({ region: 1, timestamp: 1 });

    // Verify ESR pattern analysis
    expect(analysis.esrPattern.equalityFields).toContain("region");
    expect(analysis.esrPattern.rangeFields).toContain("timestamp");
    expect(analysis.esrPattern.followsESRPattern).toBe(true);
  });

  it("should provide index metadata from sharded plans", () => {
    const shardedPlan = shardedQueryFixture as unknown as ExplainPlan;

    const analyses = analyzeExplainPlan(shardedPlan);
    const analysis = analyses[0]!;

    // Should extract metadata from the sharded index information
    expect(analysis.indexMetadata).toBeDefined();
    expect(analysis.indexMetadata?.isMultiKey).toBe(false);
    expect(analysis.indexMetadata?.isUnique).toBe(false);
    expect(analysis.indexMetadata?.isSparse).toBe(false);
    expect(analysis.indexMetadata?.isPartial).toBe(false);
    expect(analysis.indexMetadata?.indexVersion).toBe(2);
    expect(analysis.indexMetadata?.multiKeyPaths).toEqual({
      region: [],
      timestamp: [],
    });
  });

  it("should generate insights for sharded index usage", () => {
    const shardedPlan = shardedQueryFixture as unknown as ExplainPlan;

    const analyses = analyzeExplainPlan(shardedPlan);
    const analysis = analyses[0]!;

    // Should provide meaningful insights for experts
    expect(analysis.insights).toBeInstanceOf(Array);
    expect(analysis.insights.length).toBeGreaterThan(0);

    // Should include insight about query coverage
    const coverageInsight = analysis.insights.find((insight) =>
      insight.includes("Query uses"),
    );
    expect(coverageInsight).toBeDefined();

    // Should include insight about equality conditions
    const equalityInsight = analysis.insights.find((insight) =>
      insight.includes("Equality conditions should eliminate"),
    );
    expect(equalityInsight).toBeDefined();
  });

  describe("Sharded Aggregation Plans", () => {
    it("should extract query conditions from sharded aggregation plans", () => {
      const shardedAggPlan =
        shardedAggregationFixture as unknown as ExplainPlan;

      const conditions = extractQueryConditions(shardedAggPlan);

      // Should find conditions from the aggregation plan
      expect(conditions.length).toBeGreaterThanOrEqual(3);

      // Should find equality conditions
      const categoryCondition = conditions.find((c) => c.field === "category");
      expect(categoryCondition).toBeDefined();
      expect(categoryCondition?.type).toBe("equality");
      expect(categoryCondition?.operator).toBe("$eq");

      const tenantCondition = conditions.find((c) => c.field === "tenant");
      expect(tenantCondition).toBeDefined();
      expect(tenantCondition?.type).toBe("equality");
      expect(tenantCondition?.operator).toBe("$eq");

      const environmentCondition = conditions.find(
        (c) => c.field === "environment",
      );
      expect(environmentCondition).toBeDefined();
      expect(environmentCondition?.type).toBe("equality");
      expect(environmentCondition?.operator).toBe("$eq");
    });

    it("should extract indexes from sharded aggregation plans", () => {
      const shardedAggPlan =
        shardedAggregationFixture as unknown as ExplainPlan;

      const analyses = analyzeExplainPlan(shardedAggPlan);

      // Should find index analysis from the aggregation plan
      expect(analyses).toHaveLength(1);

      const analysis = analyses[0]!;
      expect(analysis.indexName).toBe("tenant_1_category_1_environment_1");
      expect(analysis.keyPattern).toEqual({
        tenant: 1,
        category: 1,
        environment: 1,
      });

      // Verify ESR pattern analysis - all equality conditions should follow ESR pattern
      expect(analysis.esrPattern.equalityFields).toContain("category");
      expect(analysis.esrPattern.equalityFields).toContain("tenant");
      expect(analysis.esrPattern.equalityFields).toContain("environment");
      expect(analysis.esrPattern.followsESRPattern).toBe(true);
    });

    it("should provide index metadata from sharded aggregation plans", () => {
      const shardedAggPlan =
        shardedAggregationFixture as unknown as ExplainPlan;

      const analyses = analyzeExplainPlan(shardedAggPlan);
      const analysis = analyses[0]!;

      // Should extract metadata from the aggregation plan index information
      expect(analysis.indexMetadata).toBeDefined();
      expect(analysis.indexMetadata?.isMultiKey).toBe(false);
      expect(analysis.indexMetadata?.isUnique).toBe(false);
      expect(analysis.indexMetadata?.isSparse).toBe(false);
      expect(analysis.indexMetadata?.isPartial).toBe(false);
      expect(analysis.indexMetadata?.indexVersion).toBe(2);
      expect(analysis.indexMetadata?.multiKeyPaths).toEqual({
        tenant: [],
        category: [],
        environment: [],
      });
    });
  });
});
