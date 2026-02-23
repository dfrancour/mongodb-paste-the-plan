/**
 * Tests for Stage Display Formatter
 *
 * Covers the public functions: createStageVisualization, extractGridMetrics,
 * extractDisplayMetrics, getContextInfo, and formatFieldValue.
 */

import { describe, it, expect } from "vitest";
import {
  createStageVisualization,
  extractGridMetrics,
  extractDisplayMetrics,
  getContextInfo,
  formatFieldValue,
} from "./stageDisplayFormatter";
import type { NormalizedExecutionStage } from "#types/explain-plan";
import type { FlowStage } from "#types/flow-visualization";
import type { AnalysisResults, AnalysisFinding } from "#lib/analyzers";
import { AnalyzerIds } from "#lib/analyzers";
import { StageCategory, StageIds } from "#data/stages/types";
import type {
  ExplainFieldDeclaration,
  ExecutionStage,
} from "#data/stages/types";
import { SPILLING_FIELDS } from "#data/stages/fields/spilling";
import { DOCS_EXAMINED_FIELD } from "#data/stages/fields/common";

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

  describe("time metric", () => {
    it("returns formatted time", () => {
      const stage = createMockNormalizedStage({
        metrics: { executionTimeMillis: 42 },
      });

      const grid = extractGridMetrics(stage);

      expect(grid.timeMetric.value).toBe("42ms");
    });

    it("returns dash for missing time", () => {
      const stage = createMockNormalizedStage({ metrics: {} });

      const grid = extractGridMetrics(stage);

      expect(grid.timeMetric.value).toBe("—");
    });
  });

  describe("warning-based coloring", () => {
    it("applies neutral color for NormalizedStage (no visualization)", () => {
      const stage = createMockNormalizedStage({
        metrics: { executionTimeMillis: 100 },
      });

      const grid = extractGridMetrics(stage);

      expect(grid.timeMetric.color).toContain("gray");
    });

    it("applies red color for critical warning on selectivity", () => {
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

    it("applies orange color for warning severity on time metric", () => {
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

      expect(grid.timeMetric.color).toContain("orange");
    });
  });

  describe("field sections", () => {
    it("returns empty sections when stage has no definition", () => {
      const stage = createMockNormalizedStage();
      const grid = extractGridMetrics(stage);
      expect(grid.fieldSections.configuration).toHaveLength(0);
      expect(grid.fieldSections.execution).toHaveLength(0);
      expect(grid.fieldSections.engine).toHaveLength(0);
    });

    it("groups execution fields into execution section", () => {
      const stage = createMockNormalizedStage({
        definition: makeExecutionDef({
          explainFields: [
            {
              ...DOCS_EXAMINED_FIELD,
              description: "Documents examined during fetch",
            },
          ],
        }),
        metrics: {
          nReturned: 100,
          executionTimeMillisEstimate: 5,
          docsExamined: 500,
        },
      });
      const grid = extractGridMetrics(stage);

      // nReturned + executionTimeMillisEstimate from common + docsExamined from stage-specific
      const keys = grid.fieldSections.execution.map((f) => f.bsonKey);
      expect(keys).toContain("nReturned");
      expect(keys).toContain("docsExamined");
      expect(keys).toContain("executionTimeMillisEstimate");
    });

    it("groups engine fields into engine section", () => {
      const stage = createMockNormalizedStage({
        definition: makeExecutionDef(),
        metrics: {
          nReturned: 100,
          works: 500,
          advanced: 100,
          needTime: 400,
        },
      });
      const grid = extractGridMetrics(stage);

      const engineKeys = grid.fieldSections.engine.map((f) => f.bsonKey);
      expect(engineKeys).toContain("works");
      expect(engineKeys).toContain("advanced");
      expect(engineKeys).toContain("needTime");

      // These should NOT be in execution section
      const execKeys = grid.fieldSections.execution.map((f) => f.bsonKey);
      expect(execKeys).not.toContain("works");
      expect(execKeys).not.toContain("advanced");
      expect(execKeys).not.toContain("needTime");
    });

    it("ensures nReturned is first in execution section", () => {
      const stage = createMockNormalizedStage({
        definition: makeExecutionDef({
          explainFields: [{ ...DOCS_EXAMINED_FIELD }],
        }),
        metrics: {
          docsExamined: 500,
          nReturned: 100,
          executionTimeMillisEstimate: 5,
        },
      });
      const grid = extractGridMetrics(stage);

      expect(grid.fieldSections.execution[0]!.bsonKey).toBe("nReturned");
    });

    it("shows zero values (server only emits fields relevant to the stage)", () => {
      const stage = createMockNormalizedStage({
        definition: makeExecutionDef({
          canSpillToDisk: true,
          explainFields: [...SPILLING_FIELDS],
        }),
        metrics: {
          nReturned: 100,
          spills: 0,
          spilledRecords: 0,
          spilledBytes: 0,
        },
      });
      const grid = extractGridMetrics(stage);

      const execKeys = grid.fieldSections.execution.map((f) => f.bsonKey);
      expect(execKeys).toContain("spills");
      expect(execKeys).toContain("spilledRecords");
      expect(execKeys).toContain("spilledBytes");
    });

    it("includes non-zero spilling fields", () => {
      const stage = createMockNormalizedStage({
        definition: makeExecutionDef({
          canSpillToDisk: true,
          explainFields: [...SPILLING_FIELDS],
        }),
        metrics: {
          nReturned: 100,
          spills: 3,
          spilledBytes: 5242880,
          spilledRecords: 0,
          spilledDataStorageSize: 0,
        },
      });
      const grid = extractGridMetrics(stage);

      const execKeys = grid.fieldSections.execution.map((f) => f.bsonKey);
      expect(execKeys).toContain("spills");
      expect(execKeys).toContain("spilledBytes");
      expect(execKeys).toContain("spilledRecords");
    });

    it("applies warning colors to fields with matching metricKey", () => {
      const flowStage = createMockFlowStage(
        {
          definition: makeExecutionDef({
            explainFields: [{ ...DOCS_EXAMINED_FIELD }],
          }),
          metrics: { nReturned: 10, docsExamined: 10000 },
        },
        [
          {
            title: "High Doc Exam",
            description: "Too many docs",
            severity: "critical",
            layer: "stage",
            category: "performance",
            metricKey: "docsExamined",
          },
        ],
      );

      const grid = extractGridMetrics(flowStage);
      const docsField = grid.fieldSections.execution.find(
        (f) => f.bsonKey === "docsExamined",
      );
      expect(docsField?.color).toContain("red");
    });

    it("no field appears in both sections (deduplication guarantee)", () => {
      const stage = createMockNormalizedStage({
        definition: makeExecutionDef({
          explainFields: [{ ...DOCS_EXAMINED_FIELD }],
        }),
        metrics: {
          nReturned: 100,
          docsExamined: 500,
          works: 600,
          advanced: 100,
          needTime: 500,
          executionTimeMillisEstimate: 5,
        },
      });
      const grid = extractGridMetrics(stage);

      const execKeys = new Set(
        grid.fieldSections.execution.map((f) => f.bsonKey),
      );
      const engineKeys = new Set(
        grid.fieldSections.engine.map((f) => f.bsonKey),
      );

      // No overlap
      for (const key of execKeys) {
        expect(engineKeys.has(key)).toBe(false);
      }
    });

    it("includes booleans regardless of true/false value", () => {
      const makeBoolStage = (value: boolean) =>
        createMockNormalizedStage({
          definition: makeExecutionDef({
            explainFields: [
              {
                bsonKey: "usedDisk",
                description: "Spilled to disk",
                valueType: "boolean",
                verbosity: "executionStats",
              },
            ],
          }),
          metrics: { nReturned: 100, usedDisk: value },
        });

      const trueGrid = extractGridMetrics(makeBoolStage(true));
      expect(trueGrid.fieldSections.execution.map((f) => f.bsonKey)).toContain(
        "usedDisk",
      );

      const falseGrid = extractGridMetrics(makeBoolStage(false));
      expect(falseGrid.fieldSections.execution.map((f) => f.bsonKey)).toContain(
        "usedDisk",
      );
    });

    it("uses bsonKey directly as the label", () => {
      const stage = createMockNormalizedStage({
        definition: makeExecutionDef({
          explainFields: [
            {
              bsonKey: "numReads",
              description: "Number of reads",
              valueType: "number",
              verbosity: "executionStats",
              unit: "count",
            },
          ],
        }),
        metrics: { nReturned: 100, numReads: 42 },
      });
      const grid = extractGridMetrics(stage);
      const numReadsField = grid.fieldSections.execution.find(
        (f) => f.bsonKey === "numReads",
      );
      expect(numReadsField).toBeDefined();
      expect(numReadsField!.bsonKey).toBe("numReads");
    });

    it("includes description and cppName for tooltips", () => {
      const stage = createMockNormalizedStage({
        definition: makeExecutionDef({
          explainFields: [
            {
              bsonKey: "docsRejected",
              description: "Documents rejected by text match",
              valueType: "number",
              verbosity: "executionStats",
              cppName: "docsRejected",
              unit: "count",
            },
          ],
        }),
        metrics: { nReturned: 100, docsRejected: 15 },
      });
      const grid = extractGridMetrics(stage);
      const field = grid.fieldSections.execution.find(
        (f) => f.bsonKey === "docsRejected",
      );
      expect(field!.description).toBe("Documents rejected by text match");
      expect(field!.cppName).toBe("docsRejected");
    });
  });

  describe("configuration section", () => {
    it("extracts indexName as inline field with description from declaration", () => {
      const stage = createMockFlowStage({
        structure: { indexName: "name_1_age_1" },
        definition: makeExecutionDef({
          explainFields: [
            {
              bsonKey: "indexName",
              description: "Name of the index being scanned",
              valueType: "string",
              verbosity: "queryPlanner",
            },
          ],
        }),
      });
      const grid = extractGridMetrics(stage);
      const field = grid.fieldSections.configuration.find(
        (f) => f.bsonKey === "indexName",
      );
      expect(field).toBeDefined();
      expect(field!.value).toBe("name_1_age_1");
      expect(field!.description).toBe("Name of the index being scanned");
    });

    it("extracts direction as inline field", () => {
      const stage = createMockFlowStage({
        structure: { direction: "forward" },
        definition: makeExecutionDef({
          explainFields: [
            {
              bsonKey: "direction",
              description: "Scan direction",
              valueType: "string",
              verbosity: "queryPlanner",
            },
          ],
        }),
      });
      const grid = extractGridMetrics(stage);
      const field = grid.fieldSections.configuration.find(
        (f) => f.bsonKey === "direction",
      );
      expect(field).toBeDefined();
      expect(field!.value).toBe("forward");
      expect(field!.multiline).toBeUndefined();
    });

    it("extracts filter as multiline JSON with fallback description", () => {
      const stage = createMockFlowStage({
        structure: { filter: { age: { $gt: 25 } } },
      });
      const grid = extractGridMetrics(stage);
      const field = grid.fieldSections.configuration.find(
        (f) => f.bsonKey === "filter",
      );
      expect(field).toBeDefined();
      expect(field!.multiline).toBe(true);
      expect(field!.value).toContain('"age"');
      expect(field!.description).toBe("Query predicate applied by this stage");
    });

    it("extracts indexBounds as multiline with description from declaration", () => {
      const stage = createMockFlowStage({
        structure: { indexBounds: { age: ["[25, Infinity]"] } },
        definition: makeExecutionDef({
          explainFields: [
            {
              bsonKey: "indexBounds",
              description: "Key ranges scanned in each index field",
              valueType: "object",
              verbosity: "queryPlanner",
            },
          ],
        }),
      });
      const grid = extractGridMetrics(stage);
      const field = grid.fieldSections.configuration.find(
        (f) => f.bsonKey === "indexBounds",
      );
      expect(field).toBeDefined();
      expect(field!.multiline).toBe(true);
      expect(field!.description).toBe("Key ranges scanned in each index field");
    });

    it("returns empty configuration when structure has no config fields", () => {
      const stage = createMockFlowStage({ structure: {} });
      const grid = extractGridMetrics(stage);
      expect(grid.fieldSections.configuration).toHaveLength(0);
    });

    it("skips empty object structural fields", () => {
      const stage = createMockFlowStage({
        structure: { filter: {}, indexBounds: {} },
      });
      const grid = extractGridMetrics(stage);
      expect(grid.fieldSections.configuration).toHaveLength(0);
    });

    it("preserves declaration ordering for configuration fields", () => {
      const stage = createMockFlowStage({
        structure: {
          filter: { x: 1 },
          indexName: "idx",
          indexBounds: { x: ["[1, 1]"] },
          direction: "forward",
        },
        definition: makeExecutionDef({
          explainFields: [
            {
              bsonKey: "indexName",
              description: "Index name",
              valueType: "string",
              verbosity: "queryPlanner",
            },
            {
              bsonKey: "direction",
              description: "Scan direction",
              valueType: "string",
              verbosity: "queryPlanner",
            },
            {
              bsonKey: "indexBounds",
              description: "Key ranges",
              valueType: "object",
              verbosity: "queryPlanner",
            },
          ],
        }),
      });
      const grid = extractGridMetrics(stage);
      const keys = grid.fieldSections.configuration.map((f) => f.bsonKey);
      // Declaration order determines display order; filter is universal (appended)
      expect(keys).toEqual(["indexName", "direction", "indexBounds", "filter"]);
    });

    it("configuration fields are available even without execution metrics", () => {
      const stage = createMockFlowStage({
        structure: { indexName: "idx_1" },
        definition: makeExecutionDef({
          explainFields: [
            {
              bsonKey: "indexName",
              description: "Index name",
              valueType: "string",
              verbosity: "queryPlanner",
            },
          ],
        }),
        // No metrics — execution/engine will be empty
      });
      const grid = extractGridMetrics(stage);
      expect(grid.fieldSections.configuration).toHaveLength(1);
      expect(grid.fieldSections.configuration[0]!.bsonKey).toBe("indexName");
      expect(grid.fieldSections.execution).toHaveLength(0);
      expect(grid.fieldSections.engine).toHaveLength(0);
    });

    it("universal filter field appears even without a stage definition", () => {
      const stage = createMockFlowStage({
        structure: { filter: { status: "active" } },
        // No definition — filter is universal
      });
      const grid = extractGridMetrics(stage);
      expect(grid.fieldSections.configuration).toHaveLength(1);
      expect(grid.fieldSections.configuration[0]!.bsonKey).toBe("filter");
      expect(grid.fieldSections.configuration[0]!.description).toBe(
        "Query predicate applied by this stage",
      );
    });

    it("queryPlanner-verbosity fields route to configuration without explicit section", () => {
      const stage = createMockFlowStage({
        structure: { sortPattern: { age: -1 }, memLimit: 104857600 },
        definition: makeExecutionDef({
          explainFields: [
            {
              bsonKey: "sortPattern",
              description: "Sort key specification",
              valueType: "object",
              verbosity: "queryPlanner",
            },
            {
              bsonKey: "memLimit",
              description: "Memory limit for in-memory sort",
              valueType: "number",
              verbosity: "queryPlanner",
              unit: "bytes",
            },
          ],
        }),
      });
      const grid = extractGridMetrics(stage);
      const keys = grid.fieldSections.configuration.map((f) => f.bsonKey);
      expect(keys).toContain("sortPattern");
      expect(keys).toContain("memLimit");
      expect(grid.fieldSections.execution.map((f) => f.bsonKey)).not.toContain(
        "sortPattern",
      );
    });

    it("formats boolean configuration fields as Yes/No", () => {
      const stage = createMockFlowStage({
        structure: { isMultiKey: true },
        definition: makeExecutionDef({
          explainFields: [
            {
              bsonKey: "isMultiKey",
              description: "Whether the index is multikey",
              valueType: "boolean",
              verbosity: "queryPlanner",
            },
          ],
        }),
      });
      const grid = extractGridMetrics(stage);
      const field = grid.fieldSections.configuration.find(
        (f) => f.bsonKey === "isMultiKey",
      );
      expect(field).toBeDefined();
      expect(field!.value).toBe("Yes");
    });

    it("formats numeric configuration fields with units", () => {
      const stage = createMockFlowStage({
        structure: { memLimit: 104857600 },
        definition: makeExecutionDef({
          explainFields: [
            {
              bsonKey: "memLimit",
              description: "Memory limit",
              valueType: "number",
              verbosity: "queryPlanner",
              unit: "bytes",
            },
          ],
        }),
      });
      const grid = extractGridMetrics(stage);
      const field = grid.fieldSections.configuration.find(
        (f) => f.bsonKey === "memLimit",
      );
      expect(field).toBeDefined();
      expect(field!.value).toBe("100 MB");
    });

    it("does not duplicate filter when stage declares it in explainFields", () => {
      const stage = createMockFlowStage({
        structure: { filter: { x: 1 } },
        definition: makeExecutionDef({
          explainFields: [
            {
              bsonKey: "filter",
              description: "Custom filter description",
              valueType: "object",
              verbosity: "queryPlanner",
            },
          ],
        }),
      });
      const grid = extractGridMetrics(stage);
      const filterFields = grid.fieldSections.configuration.filter(
        (f) => f.bsonKey === "filter",
      );
      expect(filterFields).toHaveLength(1);
      expect(filterFields[0]!.description).toBe("Custom filter description");
    });

    it("planning stage fields drive configuration section", () => {
      const stage = createMockFlowStage({
        structure: { direction: "forward", indexBounds: { a: ["[1, 1]"] } },
        definition: {
          layer: "planning",
          id: "planning:IXSCAN" as never,
          querySolutionStageType: "STAGE_IXSCAN" as never,
          fullName: "Index Scan",
          description: "Plans an index scan",
          category: StageCategory.IndexScan,
          iconName: "Search",
          blockingStage: false,
          canSpillToDisk: false,
          explainFields: [
            {
              bsonKey: "direction",
              description: "Scan direction",
              valueType: "string",
              verbosity: "queryPlanner",
            },
            {
              bsonKey: "indexBounds",
              description: "Key ranges",
              valueType: "object",
              verbosity: "queryPlanner",
            },
          ],
        } as never,
      });
      const grid = extractGridMetrics(stage);
      const keys = grid.fieldSections.configuration.map((f) => f.bsonKey);
      expect(keys).toContain("direction");
      expect(keys).toContain("indexBounds");
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
        explainFields: [],
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

// ============================================================================
// formatFieldValue
// ============================================================================

function makeField(
  overrides: Partial<ExplainFieldDeclaration> = {},
): ExplainFieldDeclaration {
  return {
    bsonKey: "test",
    description: "Test field",
    valueType: "number",
    verbosity: "executionStats",
    ...overrides,
  };
}

function makeExecutionDef(
  overrides: Partial<ExecutionStage> = {},
): ExecutionStage {
  return {
    layer: "execution",
    engine: "classic",
    id: StageIds.execution("TEST"),
    fullName: "Test",
    description: "Test",
    category: StageCategory.Internal,
    iconName: "CircleQuestionMark",
    blockingStage: false,
    canSpillToDisk: false,
    explainFields: [],
    ...overrides,
  } as ExecutionStage;
}

describe("formatFieldValue", () => {
  it("formats booleans as Yes/No", () => {
    expect(formatFieldValue(true, makeField({ valueType: "boolean" }))).toBe(
      "Yes",
    );
    expect(formatFieldValue(false, makeField({ valueType: "boolean" }))).toBe(
      "No",
    );
  });

  it("passes strings through", () => {
    expect(
      formatFieldValue("forward", makeField({ valueType: "string" })),
    ).toBe("forward");
  });

  it("formats counts with locale separators", () => {
    expect(formatFieldValue(1234567, makeField({ unit: "count" }))).toBe(
      "1,234,567",
    );
  });

  it("formats milliseconds", () => {
    expect(formatFieldValue(42, makeField({ unit: "ms" }))).toBe("42ms");
    expect(formatFieldValue(1500, makeField({ unit: "ms" }))).toBe("1,500ms");
  });

  describe("bytes formatting", () => {
    it("formats 0 bytes", () => {
      expect(formatFieldValue(0, makeField({ unit: "bytes" }))).toBe("0 B");
    });

    it("formats negative bytes as 0 B", () => {
      expect(formatFieldValue(-100, makeField({ unit: "bytes" }))).toBe("0 B");
    });

    it("formats small values in bytes", () => {
      expect(formatFieldValue(512, makeField({ unit: "bytes" }))).toBe("512 B");
    });

    it("formats kilobytes", () => {
      expect(formatFieldValue(5120, makeField({ unit: "bytes" }))).toBe(
        "5.0 KB",
      );
    });

    it("formats megabytes", () => {
      expect(formatFieldValue(5242880, makeField({ unit: "bytes" }))).toBe(
        "5.0 MB",
      );
    });

    it("formats large megabytes without excess decimals", () => {
      expect(formatFieldValue(104857600, makeField({ unit: "bytes" }))).toBe(
        "100 MB",
      );
    });

    it("formats bytes at the 10 KB boundary (no decimal)", () => {
      expect(formatFieldValue(10240, makeField({ unit: "bytes" }))).toBe(
        "10 KB",
      );
    });

    it("formats bytes just below 10 KB with one decimal", () => {
      expect(formatFieldValue(9728, makeField({ unit: "bytes" }))).toBe(
        "9.5 KB",
      );
    });

    it("formats gigabytes", () => {
      expect(formatFieldValue(1073741824, makeField({ unit: "bytes" }))).toBe(
        "1.0 GB",
      );
    });
  });

  it("formats numbers without unit", () => {
    expect(formatFieldValue(42, makeField())).toBe("42");
  });
});
