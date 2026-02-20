/**
 * Tests for Stage Display Formatter
 *
 * Covers the 4 public functions: createStageVisualization, extractGridMetrics,
 * extractDisplayMetrics, and getContextInfo.
 */

import { describe, it, expect } from "vitest";
import {
  createStageVisualization,
  extractGridMetrics,
  extractDisplayMetrics,
  getContextInfo,
} from "./stageDisplayFormatter";
import type { NormalizedExecutionStage } from "#types/explain-plan";
import type { FlowStage } from "#types/flow-visualization";
import type { AnalysisResults, AnalysisFinding } from "#lib/analyzers";
import { AnalyzerIds } from "#lib/analyzers";
import { StageCategory, StageIds } from "#data/stages/types";

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockNormalizedStage(
  overrides: Partial<NormalizedExecutionStage> = {},
): NormalizedExecutionStage {
  return {
    id: "stage-1",
    stage: "TEST_STAGE",
    category: StageCategory.Internal,
    iconName: "CircleQuestionMark",
    structure: {},
    metrics: {},
    children: [],
    depth: 0,
    ...overrides,
  };
}

function createEmptyResults(
  findings: AnalysisFinding[] = [],
  byStageId: Record<string, AnalysisFinding[]> = {},
): AnalysisResults {
  return {
    findings,
    bySeverity: { critical: [], warning: [], info: [] },
    byCategory: {
      performance: [],
      indexUsage: [],
      memoryUsage: [],
      queryPattern: [],
      optimization: [],
    },
    byStageId,
    summary: {
      totalFindings: findings.length,
      criticalCount: 0,
      warningCount: 0,
      infoCount: 0,
      analyzerDefinitionsRun: 0,
    },
  };
}

function createMockFlowStage(
  overrides: Partial<NormalizedExecutionStage> = {},
  warnings: FlowStage["visualization"]["warnings"] = [],
): FlowStage {
  const base = createMockNormalizedStage(overrides);
  return {
    ...base,
    position: { x: 0, y: 0, level: 0 },
    connections: [],
    visualization: {
      performanceLevel: "good",
      primaryMetric: "0 → 0",
      warnings,
    },
    state: { isHighlighted: false, showTooltip: false },
  } as FlowStage;
}

// ============================================================================
// createStageVisualization
// ============================================================================

describe("createStageVisualization", () => {
  it("returns correct performanceLevel from critical findings", () => {
    const stage = createMockNormalizedStage({ id: "s1" });
    const finding: AnalysisFinding = {
      id: "f1",
      analyzerId: AnalyzerIds.stage("low_selectivity"),
      severity: "critical",
      category: "performance",
      title: "Low Selectivity",
      description: "Very low selectivity",
      suggestion: "Add an index",
      affectedStageIds: ["s1"],
    };
    const results = createEmptyResults([finding], { s1: [finding] });

    const viz = createStageVisualization(stage, results);

    expect(viz.performanceLevel).toBe("critical");
  });

  it("populates warnings array from findings", () => {
    const stage = createMockNormalizedStage({ id: "s1" });
    const finding: AnalysisFinding = {
      id: "f1",
      analyzerId: AnalyzerIds.stage("low_selectivity"),
      severity: "warning",
      category: "performance",
      title: "Warning Title",
      description: "Warning desc",
      affectedStageIds: ["s1"],
    };
    const results = createEmptyResults([finding], { s1: [finding] });

    const viz = createStageVisualization(stage, results);

    expect(viz.warnings.length).toBe(1);
    expect(viz.warnings[0]!.title).toBe("Warning Title");
    expect(viz.warnings[0]!.severity).toBe("warning");
  });

  it("handles stage with no findings (good performance, empty warnings)", () => {
    const stage = createMockNormalizedStage({ id: "s1" });
    const results = createEmptyResults();

    const viz = createStageVisualization(stage, results);

    expect(viz.performanceLevel).toBe("good");
    expect(viz.warnings).toEqual([]);
    expect(viz.optimizationSuggestion).toBeUndefined();
  });

  it("sets optimizationSuggestion from most severe finding", () => {
    const stage = createMockNormalizedStage({ id: "s1" });
    const criticalFinding: AnalysisFinding = {
      id: "f1",
      analyzerId: AnalyzerIds.stage("low_selectivity"),
      severity: "critical",
      category: "performance",
      title: "Critical Issue",
      description: "Critical desc",
      suggestion: "Fix it now",
      affectedStageIds: ["s1"],
    };
    const warningFinding: AnalysisFinding = {
      id: "f2",
      analyzerId: AnalyzerIds.stage("high_execution_time"),
      severity: "warning",
      category: "performance",
      title: "Warning Issue",
      description: "Warning desc",
      suggestion: "Consider optimizing",
      affectedStageIds: ["s1"],
    };
    const results = createEmptyResults([criticalFinding, warningFinding], {
      s1: [criticalFinding, warningFinding],
    });

    const viz = createStageVisualization(stage, results);

    expect(viz.optimizationSuggestion).toBe("Fix it now");
  });
});

// ============================================================================
// extractGridMetrics
// ============================================================================

describe("extractGridMetrics", () => {
  describe("flow metrics", () => {
    it("returns examination count as input for leaf stages", () => {
      const stage = createMockNormalizedStage({
        metrics: { docsExamined: 500, nReturned: 100 },
        children: [],
      });

      const grid = extractGridMetrics(stage);

      expect(grid.flowMetrics.input).toBe("500");
      expect(grid.flowMetrics.output).toBe("100");
      expect(grid.flowMetrics.direction).toBe("→");
    });

    it("returns children output sum as input for non-leaf stages", () => {
      const stage = createMockNormalizedStage({
        metrics: { nReturned: 50 },
        children: [
          createMockNormalizedStage({ metrics: { nReturned: 30 } }),
          createMockNormalizedStage({ metrics: { nReturned: 20 } }),
        ],
      });

      const grid = extractGridMetrics(stage);

      expect(grid.flowMetrics.input).toBe("50");
      expect(grid.flowMetrics.output).toBe("50");
    });
  });

  describe("core metrics", () => {
    it("returns formatted keys, docs, and time", () => {
      const stage = createMockNormalizedStage({
        metrics: {
          keysExamined: 1500,
          docsExamined: 1000,
          executionTimeMillis: 42,
        },
      });

      const grid = extractGridMetrics(stage);

      expect(grid.coreMetrics.keys.value).toBe("1,500");
      expect(grid.coreMetrics.docs.value).toBe("1,000");
      expect(grid.coreMetrics.time.value).toBe("42ms");
    });

    it("returns dash for missing metrics", () => {
      const stage = createMockNormalizedStage({ metrics: {} });

      const grid = extractGridMetrics(stage);

      expect(grid.coreMetrics.keys.value).toBe("—");
      expect(grid.coreMetrics.docs.value).toBe("—");
      expect(grid.coreMetrics.time.value).toBe("—");
    });
  });

  describe("warning-based coloring", () => {
    it("applies neutral color for NormalizedStage (no visualization)", () => {
      const stage = createMockNormalizedStage({
        metrics: { keysExamined: 100 },
      });

      const grid = extractGridMetrics(stage);

      expect(grid.coreMetrics.keys.color).toContain("gray");
    });

    it("applies red color for critical warning on matched metric", () => {
      const flowStage = createMockFlowStage(
        { metrics: { docsExamined: 1000, keysExamined: 100 } },
        [
          {
            title: "Low Selectivity",
            description: "Bad",
            severity: "critical",
            layer: "stage",
            category: "performance",
            metricKey: "selectivity",
          },
        ],
      );

      const grid = extractGridMetrics(flowStage);

      expect(grid.performanceIndicators.selectivity.color).toContain("red");
    });

    it("applies orange color for warning severity on matched metric", () => {
      const flowStage = createMockFlowStage(
        { metrics: { executionTimeMillis: 200 } },
        [
          {
            title: "High Time",
            description: "Slow",
            severity: "warning",
            layer: "stage",
            category: "performance",
            metricKey: "executionTime",
          },
        ],
      );

      const grid = extractGridMetrics(flowStage);

      expect(grid.coreMetrics.time.color).toContain("orange");
    });

    it("applies neutral color when no warning matches the metric", () => {
      const flowStage = createMockFlowStage(
        { metrics: { keysExamined: 100, docsExamined: 50 } },
        [
          {
            title: "Some Warning",
            description: "Desc",
            severity: "warning",
            layer: "stage",
            category: "performance",
            metricKey: "executionTime",
          },
        ],
      );

      const grid = extractGridMetrics(flowStage);

      expect(grid.coreMetrics.keys.color).toContain("gray");
      expect(grid.coreMetrics.docs.color).toContain("gray");
    });
  });
});

// ============================================================================
// extractDisplayMetrics
// ============================================================================

describe("extractDisplayMetrics", () => {
  it("returns formatted primary metric string", () => {
    const stage = createMockNormalizedStage({
      metrics: { docsExamined: 500, nReturned: 100 },
    });

    const display = extractDisplayMetrics(stage);

    expect(display.primary).toBe("500 → 100");
  });

  it("returns context info as secondary metric", () => {
    const stage = createMockNormalizedStage({
      category: StageCategory.Sort,
      metrics: {},
    });

    const display = extractDisplayMetrics(stage);

    expect(display.secondary).toBe("sort operation");
  });

  it("defaults to 0 when metrics are missing", () => {
    const stage = createMockNormalizedStage({ metrics: {} });

    const display = extractDisplayMetrics(stage);

    expect(display.primary).toBe("0 → 0");
  });
});

// ============================================================================
// getContextInfo
// ============================================================================

describe("getContextInfo", () => {
  it("IndexScan shows index name", () => {
    const stage = createMockNormalizedStage({
      category: StageCategory.IndexScan,
      structure: { indexName: "idx_user_email" },
    });

    const info = getContextInfo(stage);

    expect(info).toBe("idx_user_email");
  });

  it("IndexScan shows index name and bounds", () => {
    const stage = createMockNormalizedStage({
      category: StageCategory.IndexScan,
      structure: {
        indexName: "idx_email",
        indexBounds: { email: ['["test@example.com", "test@example.com"]'] },
      },
    });

    const info = getContextInfo(stage);

    expect(info).toContain("idx_email");
    expect(info).toContain("email=test@example.com");
  });

  it("CollectionScan shows filter info", () => {
    const stage = createMockNormalizedStage({
      category: StageCategory.CollectionScan,
      structure: {
        filter: { status: { $eq: "active" } },
      },
    });

    const info = getContextInfo(stage);

    expect(info).toContain("collection scan");
    expect(info).toContain("status=active");
  });

  it("CollectionScan without filter shows simple label", () => {
    const stage = createMockNormalizedStage({
      category: StageCategory.CollectionScan,
      metrics: {},
    });

    const info = getContextInfo(stage);

    expect(info).toBe("collection scan");
  });

  it("Fetch shows filter info", () => {
    const stage = createMockNormalizedStage({
      category: StageCategory.Fetch,
      structure: {
        filter: { age: { $gte: 18 } },
      },
    });

    const info = getContextInfo(stage);

    expect(info).toContain("fetch");
    expect(info).toContain("age>=18");
  });

  it("Fetch without filter shows default label", () => {
    const stage = createMockNormalizedStage({
      category: StageCategory.Fetch,
      metrics: {},
    });

    const info = getContextInfo(stage);

    expect(info).toBe("document fetch");
  });

  it("Sort shows sort operation", () => {
    const stage = createMockNormalizedStage({
      category: StageCategory.Sort,
      metrics: {},
    });

    const info = getContextInfo(stage);

    expect(info).toBe("sort operation");
  });

  it("SHARD_MERGE shows shard count", () => {
    const stage = createMockNormalizedStage({
      stage: "SHARD_MERGE",
      children: [
        createMockNormalizedStage({ id: "shard-1" }),
        createMockNormalizedStage({ id: "shard-2" }),
        createMockNormalizedStage({ id: "shard-3" }),
      ],
    });

    const info = getContextInfo(stage);

    expect(info).toBe("3 shards");
  });

  it("defaults to definition fullName", () => {
    const stage = createMockNormalizedStage({
      stage: "SOME_STAGE",
      definition: {
        layer: "execution",
        engine: "classic",
        id: StageIds.execution("SOME_STAGE"),
        fullName: "Some Custom Stage",
        description: "test",
        category: StageCategory.Internal,
        iconName: "CircleQuestionMark",
        blockingStage: false,
        canSpillToDisk: false,
      },
    });

    const info = getContextInfo(stage);

    expect(info).toBe("some custom stage");
  });

  it("falls back to lowercase stage name when no definition", () => {
    const stage = createMockNormalizedStage({
      stage: "MY_STAGE",
    });

    const info = getContextInfo(stage);

    expect(info).toBe("my_stage");
  });

  it("Join shows join operation", () => {
    const stage = createMockNormalizedStage({
      category: StageCategory.Join,
    });

    const info = getContextInfo(stage);

    expect(info).toBe("join operation");
  });

  it("TextSearch shows text search", () => {
    const stage = createMockNormalizedStage({
      category: StageCategory.TextSearch,
    });

    const info = getContextInfo(stage);

    expect(info).toBe("text search");
  });
});
