import { describe, it, expect } from "vitest";
import { selfTimeAnalysis, calculateSelfTime } from "./self_time_analysis";
import { createMockNormalizedStage } from "../test-helpers";
import type { SubtreeInput } from "../types";
import type { MongosStage } from "#data/stages/types";
import { StageCategory, StageIds } from "#data/stages/types";

const PARALLEL_DEFINITION: MongosStage = {
  layer: "mongos",
  id: StageIds.mongos("SHARD_MERGE"),
  fullName: "Shard Merge",
  description: "Test parallel stage",
  category: StageCategory.Internal,
  iconName: "Merge",
  hasParallelChildren: true,
  blockingStage: false,
  canSpillToDisk: false,
  explainFields: [],
};

describe("calculateSelfTime", () => {
  it("sets selfTimeMillis equal to executionTimeMillis for leaf nodes", () => {
    const leaf = createMockNormalizedStage({
      metrics: { executionTimeMillis: 42 },
    });

    calculateSelfTime(leaf);

    expect(leaf.metrics.selfTimeMillis).toBe(42);
  });

  it("calculates selfTimeMillis for a parent with a single child", () => {
    const child = createMockNormalizedStage({
      id: "child",
      metrics: { executionTimeMillis: 30 },
    });
    const parent = createMockNormalizedStage({
      id: "parent",
      metrics: { executionTimeMillis: 100 },
      children: [child],
    });

    calculateSelfTime(parent);

    expect(parent.metrics.selfTimeMillis).toBe(70);
    expect(child.metrics.selfTimeMillis).toBe(30);
  });

  it("calculates selfTimeMillis for a parent with multiple children", () => {
    const child1 = createMockNormalizedStage({
      id: "child1",
      metrics: { executionTimeMillis: 20 },
    });
    const child2 = createMockNormalizedStage({
      id: "child2",
      metrics: { executionTimeMillis: 30 },
    });
    const parent = createMockNormalizedStage({
      id: "parent",
      metrics: { executionTimeMillis: 100 },
      children: [child1, child2],
    });

    calculateSelfTime(parent);

    expect(parent.metrics.selfTimeMillis).toBe(50);
    expect(child1.metrics.selfTimeMillis).toBe(20);
    expect(child2.metrics.selfTimeMillis).toBe(30);
  });

  it("clamps negative self time to 0", () => {
    const child = createMockNormalizedStage({
      id: "child",
      metrics: { executionTimeMillis: 120 },
    });
    const parent = createMockNormalizedStage({
      id: "parent",
      metrics: { executionTimeMillis: 100 },
      children: [child],
    });

    calculateSelfTime(parent);

    expect(parent.metrics.selfTimeMillis).toBe(0);
    expect(child.metrics.selfTimeMillis).toBe(120);
  });

  it("leaves selfTimeMillis undefined when executionTimeMillis is missing", () => {
    const leaf = createMockNormalizedStage({
      metrics: {},
    });

    calculateSelfTime(leaf);

    expect(leaf.metrics.selfTimeMillis).toBeUndefined();
  });

  it("treats children without executionTimeMillis as 0 for subtraction", () => {
    const childWithTime = createMockNormalizedStage({
      id: "child1",
      metrics: { executionTimeMillis: 30 },
    });
    const childWithoutTime = createMockNormalizedStage({
      id: "child2",
      metrics: {},
    });
    const parent = createMockNormalizedStage({
      id: "parent",
      metrics: { executionTimeMillis: 100 },
      children: [childWithTime, childWithoutTime],
    });

    calculateSelfTime(parent);

    expect(parent.metrics.selfTimeMillis).toBe(70);
    expect(childWithTime.metrics.selfTimeMillis).toBe(30);
    expect(childWithoutTime.metrics.selfTimeMillis).toBeUndefined();
  });

  it("uses max for parallel children (hasParallelChildren)", () => {
    const shard1 = createMockNormalizedStage({
      id: "shard1",
      metrics: { executionTimeMillis: 80 },
    });
    const shard2 = createMockNormalizedStage({
      id: "shard2",
      metrics: { executionTimeMillis: 90 },
    });
    const parent = createMockNormalizedStage({
      id: "parent",
      stage: "SHARD_MERGE",
      metrics: { executionTimeMillis: 100 },
      definition: PARALLEL_DEFINITION,
      children: [shard1, shard2],
    });

    calculateSelfTime(parent);

    // selfTime = 100 - max(80, 90) = 10ms (merge overhead)
    expect(parent.metrics.selfTimeMillis).toBe(10);
    expect(shard1.metrics.selfTimeMillis).toBe(80);
    expect(shard2.metrics.selfTimeMillis).toBe(90);
  });

  it("uses max for parallel stage with a single child", () => {
    const shard = createMockNormalizedStage({
      id: "shard",
      metrics: { executionTimeMillis: 80 },
    });
    const parent = createMockNormalizedStage({
      id: "parent",
      stage: "SINGLE_SHARD",
      metrics: { executionTimeMillis: 85 },
      definition: PARALLEL_DEFINITION,
      children: [shard],
    });

    calculateSelfTime(parent);

    // selfTime = 85 - max(80) = 5ms
    expect(parent.metrics.selfTimeMillis).toBe(5);
  });

  it("still uses sum for non-parallel multi-children stages", () => {
    const child1 = createMockNormalizedStage({
      id: "child1",
      metrics: { executionTimeMillis: 20 },
    });
    const child2 = createMockNormalizedStage({
      id: "child2",
      metrics: { executionTimeMillis: 30 },
    });
    const parent = createMockNormalizedStage({
      id: "parent",
      stage: "OR",
      metrics: { executionTimeMillis: 100 },
      // no definition with hasParallelChildren
      children: [child1, child2],
    });

    calculateSelfTime(parent);

    // selfTime = 100 - (20 + 30) = 50ms (sum behavior)
    expect(parent.metrics.selfTimeMillis).toBe(50);
  });

  it("allows sum of self-times to exceed root time for parallel trees", () => {
    const shard1 = createMockNormalizedStage({
      id: "shard1",
      metrics: { executionTimeMillis: 80 },
    });
    const shard2 = createMockNormalizedStage({
      id: "shard2",
      metrics: { executionTimeMillis: 90 },
    });
    const root = createMockNormalizedStage({
      id: "root",
      stage: "SHARD_MERGE",
      metrics: { executionTimeMillis: 100 },
      definition: PARALLEL_DEFINITION,
      children: [shard1, shard2],
    });

    calculateSelfTime(root);

    // sum of all self-times: 10 (root) + 80 (shard1) + 90 (shard2) = 180
    // This exceeds root.executionTimeMillis (100) — expected for parallel execution
    const sumSelfTimes = (stage: typeof root): number => {
      const self = stage.metrics.selfTimeMillis ?? 0;
      return self + stage.children.reduce((sum, c) => sum + sumSelfTimes(c), 0);
    };

    expect(sumSelfTimes(root)).toBe(180);
    expect(sumSelfTimes(root)).toBeGreaterThan(100);
  });

  it("ensures all self times sum to root executionTimeMillis", () => {
    const grandchild = createMockNormalizedStage({
      id: "grandchild",
      metrics: { executionTimeMillis: 10 },
    });
    const child = createMockNormalizedStage({
      id: "child",
      metrics: { executionTimeMillis: 60 },
      children: [grandchild],
    });
    const root = createMockNormalizedStage({
      id: "root",
      metrics: { executionTimeMillis: 100 },
      children: [child],
    });

    calculateSelfTime(root);

    // root self = 100 - 60 = 40
    // child self = 60 - 10 = 50
    // grandchild self = 10
    // sum = 40 + 50 + 10 = 100 = root.executionTimeMillis
    const sumSelfTimes = (stage: typeof root): number => {
      const self = stage.metrics.selfTimeMillis ?? 0;
      return self + stage.children.reduce((sum, c) => sum + sumSelfTimes(c), 0);
    };

    expect(sumSelfTimes(root)).toBe(100);
  });
});

describe("selfTimeAnalysis", () => {
  it("detects critical self time (>=500ms)", () => {
    const input: SubtreeInput = {
      stage: createMockNormalizedStage({
        id: "parent",
        stage: "SORT",
        metrics: { executionTimeMillis: 600, selfTimeMillis: 550 },
      }),
      children: [
        createMockNormalizedStage({
          id: "child",
          metrics: { executionTimeMillis: 50 },
        }),
      ],
      ancestors: [],
      totalExecutionTime: 600,
    };

    const findings = selfTimeAnalysis.analyze(input);

    expect(findings.length).toBe(1);
    expect(findings[0]!.severity).toBe("critical");
    expect(findings[0]!.metadata?.selfTimeMs).toBe(550);
  });

  it("detects warning self time (>=100ms)", () => {
    const input: SubtreeInput = {
      stage: createMockNormalizedStage({
        id: "parent",
        stage: "FETCH",
        metrics: { executionTimeMillis: 200, selfTimeMillis: 150 },
      }),
      children: [
        createMockNormalizedStage({
          id: "child",
          metrics: { executionTimeMillis: 50 },
        }),
      ],
      ancestors: [],
      totalExecutionTime: 200,
    };

    const findings = selfTimeAnalysis.analyze(input);

    expect(findings.length).toBe(1);
    expect(findings[0]!.severity).toBe("warning");
  });

  it("skips when self time is below threshold", () => {
    const input: SubtreeInput = {
      stage: createMockNormalizedStage({
        id: "parent",
        stage: "SORT",
        metrics: { executionTimeMillis: 100, selfTimeMillis: 80 },
      }),
      children: [
        createMockNormalizedStage({
          id: "child",
          metrics: { executionTimeMillis: 20 },
        }),
      ],
      ancestors: [],
      totalExecutionTime: 100,
    };

    // Self time = 80ms (below 100ms warning threshold)
    const findings = selfTimeAnalysis.analyze(input);

    expect(findings.length).toBe(0);
  });

  it("flags leaf nodes with high absolute self time", () => {
    const input: SubtreeInput = {
      stage: createMockNormalizedStage({
        stage: "COLLSCAN",
        metrics: { executionTimeMillis: 600, selfTimeMillis: 600 },
      }),
      children: [],
      ancestors: [],
      totalExecutionTime: 600,
    };

    const findings = selfTimeAnalysis.analyze(input);

    expect(findings.length).toBe(1);
    expect(findings[0]!.severity).toBe("critical");
  });

  it("skips leaf nodes with low absolute self time", () => {
    const input: SubtreeInput = {
      stage: createMockNormalizedStage({
        stage: "COLLSCAN",
        metrics: { executionTimeMillis: 13, selfTimeMillis: 13 },
      }),
      children: [],
      ancestors: [],
      totalExecutionTime: 13,
    };

    const findings = selfTimeAnalysis.analyze(input);

    expect(findings.length).toBe(0);
  });

  it("provides contextual suggestions for SORT stages", () => {
    const input: SubtreeInput = {
      stage: createMockNormalizedStage({
        stage: "SORT",
        metrics: { executionTimeMillis: 600, selfTimeMillis: 550 },
      }),
      children: [
        createMockNormalizedStage({
          id: "child",
          metrics: { executionTimeMillis: 50 },
        }),
      ],
      ancestors: [],
      totalExecutionTime: 600,
    };

    const findings = selfTimeAnalysis.analyze(input);

    expect(findings.length).toBe(1);
    expect(findings[0]!.suggestion).toContain("sort");
  });
});
