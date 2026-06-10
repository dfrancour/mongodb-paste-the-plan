/**
 * Tests for Analyzer Registry, Type Guards, and Utility Functions
 *
 * Individual analyzer tests live colocated with their implementations.
 * Visualization adapter tests live in visualization_adapter.test.ts.
 */

import { describe, it, expect } from "vitest";
import {
  // Registry
  ANALYZER_DEFINITIONS,
  getAllAnalyzers,
  getAnalyzer,
  getAnalyzersByLayer,
  getEnabledAnalyzers,
  // Layer-specific getters
  getStageDefinitionAnalyzers,
  getStageAnalyzers,
  getSubtreeAnalyzers,
  getPlanAnalyzers,
  getAggregationAnalyzers,
  // Type guards
  isStageDefinitionAnalyzer,
  isStageAnalyzer,
  isSubtreeAnalyzer,
  isPlanAnalyzer,
  isAggregationAnalyzer,
  ANALYZER_LAYERS,
  // Utilities
  flattenStageTree,
  buildAncestorsMap,
  calculateTotalExecutionTime,
  aggregateFindings,
  getMostSevereFinding,
  // Individual analyzers (for test data)
  collscanAntipattern,
  lowDocumentEfficiency,
  selfTimeAnalysis,
  overallEfficiency,
  matchAfterProject,
} from ".";
import type { AnalysisFinding } from ".";
import { createMockNormalizedStage } from "./test-helpers";

// ============================================================================
// Registry Tests
// ============================================================================

describe("Analyzer Registry", () => {
  const allAnalyzers = getAllAnalyzers();

  describe("analyzer counts", () => {
    it("has expected total analyzer count", () => {
      // 4 stage-definition + 5 stage + 1 subtree + 3 plan + 1 aggregation = 14
      expect(allAnalyzers.length).toBe(14);
    });

    it("has analyzers in each layer", () => {
      expect(getStageDefinitionAnalyzers().length).toBeGreaterThan(0);
      expect(getStageAnalyzers().length).toBeGreaterThan(0);
      expect(getSubtreeAnalyzers().length).toBeGreaterThan(0);
      expect(getPlanAnalyzers().length).toBeGreaterThan(0);
      expect(getAggregationAnalyzers().length).toBeGreaterThan(0);
    });
  });

  describe("required fields", () => {
    it("all analyzers have an id", () => {
      for (const analyzer of allAnalyzers) {
        expect(analyzer.id, `Analyzer missing id`).toBeDefined();
        expect(typeof analyzer.id).toBe("string");
        expect((analyzer.id as string).length).toBeGreaterThan(0);
      }
    });

    it("all analyzers have a name", () => {
      for (const analyzer of allAnalyzers) {
        expect(
          analyzer.name,
          `Analyzer ${analyzer.id} missing name`,
        ).toBeDefined();
        expect(typeof analyzer.name).toBe("string");
        expect(analyzer.name.length).toBeGreaterThan(0);
      }
    });

    it("all analyzers have a description", () => {
      for (const analyzer of allAnalyzers) {
        expect(
          analyzer.description,
          `Analyzer ${analyzer.id} missing description`,
        ).toBeDefined();
        expect(typeof analyzer.description).toBe("string");
        expect(analyzer.description.length).toBeGreaterThan(0);
      }
    });

    it("all analyzers have a layer", () => {
      for (const analyzer of allAnalyzers) {
        expect(
          analyzer.layer,
          `Analyzer ${analyzer.id} missing layer`,
        ).toBeDefined();
        expect(ANALYZER_LAYERS).toContain(analyzer.layer);
      }
    });

    it("all analyzers have enabledByDefault defined", () => {
      for (const analyzer of allAnalyzers) {
        expect(
          typeof analyzer.enabledByDefault,
          `Analyzer ${analyzer.id} missing enabledByDefault`,
        ).toBe("boolean");
      }
    });

    it("all analyzers have an analyze function", () => {
      for (const analyzer of allAnalyzers) {
        expect(
          typeof analyzer.analyze,
          `Analyzer ${analyzer.id} missing analyze function`,
        ).toBe("function");
      }
    });
  });

  describe("ID uniqueness", () => {
    it("no duplicate IDs across all analyzers", () => {
      const ids = allAnalyzers.map((a) => a.id as string);
      const uniqueIds = new Set(ids);
      const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);

      expect(
        duplicates,
        `Duplicate analyzer IDs found: ${duplicates.join(", ")}`,
      ).toHaveLength(0);
      expect(uniqueIds.size).toBe(allAnalyzers.length);
    });

    it("analyzer IDs match ANALYZER_DEFINITIONS keys", () => {
      for (const analyzer of allAnalyzers) {
        expect(
          ANALYZER_DEFINITIONS[analyzer.id as string],
          `Analyzer ${analyzer.id} not found in ANALYZER_DEFINITIONS`,
        ).toBeDefined();
      }
    });
  });
});

// ============================================================================
// Type Guards Tests
// ============================================================================

describe("Analyzer Type Guards", () => {
  describe("isStageDefinitionAnalyzer", () => {
    it("returns true for stage definition analyzers", () => {
      expect(isStageDefinitionAnalyzer(collscanAntipattern)).toBe(true);
    });

    it("returns false for other analyzer types", () => {
      expect(isStageDefinitionAnalyzer(lowDocumentEfficiency)).toBe(false);
      expect(isStageDefinitionAnalyzer(selfTimeAnalysis)).toBe(false);
    });
  });

  describe("isStageAnalyzer", () => {
    it("returns true for stage analyzers", () => {
      expect(isStageAnalyzer(lowDocumentEfficiency)).toBe(true);
    });

    it("returns false for other analyzer types", () => {
      expect(isStageAnalyzer(collscanAntipattern)).toBe(false);
    });
  });

  describe("isSubtreeAnalyzer", () => {
    it("returns true for subtree analyzers", () => {
      expect(isSubtreeAnalyzer(selfTimeAnalysis)).toBe(true);
    });

    it("returns false for other analyzer types", () => {
      expect(isSubtreeAnalyzer(lowDocumentEfficiency)).toBe(false);
    });
  });

  describe("isPlanAnalyzer", () => {
    it("returns true for plan analyzers", () => {
      expect(isPlanAnalyzer(overallEfficiency)).toBe(true);
    });

    it("returns false for other analyzer types", () => {
      expect(isPlanAnalyzer(lowDocumentEfficiency)).toBe(false);
    });
  });

  describe("isAggregationAnalyzer", () => {
    it("returns true for aggregation analyzers", () => {
      expect(isAggregationAnalyzer(matchAfterProject)).toBe(true);
    });

    it("returns false for other analyzer types", () => {
      expect(isAggregationAnalyzer(lowDocumentEfficiency)).toBe(false);
    });
  });

  describe("partition correctness", () => {
    it("every analyzer is exactly one type", () => {
      for (const analyzer of getAllAnalyzers()) {
        const isSD = isStageDefinitionAnalyzer(analyzer);
        const isS = isStageAnalyzer(analyzer);
        const isST = isSubtreeAnalyzer(analyzer);
        const isP = isPlanAnalyzer(analyzer);
        const isA = isAggregationAnalyzer(analyzer);

        const trueCount = [isSD, isS, isST, isP, isA].filter(Boolean).length;
        expect(
          trueCount,
          `Analyzer ${analyzer.id} matched ${trueCount} type guards (expected 1)`,
        ).toBe(1);
      }
    });
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe("Utility Functions", () => {
  describe("getAnalyzersByLayer", () => {
    it("returns correct analyzers for each layer", () => {
      for (const layer of ANALYZER_LAYERS) {
        const analyzers = getAnalyzersByLayer(layer);
        for (const analyzer of analyzers) {
          expect(analyzer.layer).toBe(layer);
        }
      }
    });
  });

  describe("getEnabledAnalyzers", () => {
    it("returns only analyzers with enabledByDefault: true", () => {
      const enabled = getEnabledAnalyzers();
      for (const analyzer of enabled) {
        expect(analyzer.enabledByDefault).toBe(true);
      }
    });
  });

  describe("getAnalyzer", () => {
    it("returns analyzer by ID", () => {
      // IDs now include layer prefix for layer identification
      const analyzer = getAnalyzer("stageDefinition:collscan_antipattern");
      expect(analyzer).toBeDefined();
      expect(analyzer?.id).toBe("stageDefinition:collscan_antipattern");
    });

    it("returns undefined for unknown ID", () => {
      expect(getAnalyzer("unknown_analyzer")).toBeUndefined();
    });
  });

  describe("flattenStageTree", () => {
    it("flattens a simple tree", () => {
      const root = createMockNormalizedStage({
        id: "root",
        children: [
          createMockNormalizedStage({ id: "child1" }),
          createMockNormalizedStage({ id: "child2" }),
        ],
      });

      const flattened = flattenStageTree(root);
      expect(flattened.map((s) => s.id)).toEqual(["root", "child1", "child2"]);
    });

    it("flattens a deep tree in pre-order", () => {
      const root = createMockNormalizedStage({
        id: "root",
        children: [
          createMockNormalizedStage({
            id: "child1",
            children: [createMockNormalizedStage({ id: "grandchild1" })],
          }),
          createMockNormalizedStage({ id: "child2" }),
        ],
      });

      const flattened = flattenStageTree(root);
      expect(flattened.map((s) => s.id)).toEqual([
        "root",
        "child1",
        "grandchild1",
        "child2",
      ]);
    });
  });

  describe("buildAncestorsMap", () => {
    it("builds correct ancestor chains", () => {
      const grandchild = createMockNormalizedStage({ id: "grandchild" });
      const child = createMockNormalizedStage({
        id: "child",
        children: [grandchild],
      });
      const root = createMockNormalizedStage({
        id: "root",
        children: [child],
      });

      const map = buildAncestorsMap(root);

      expect(map.get("root")?.map((s) => s.id)).toEqual([]);
      expect(map.get("child")?.map((s) => s.id)).toEqual(["root"]);
      expect(map.get("grandchild")?.map((s) => s.id)).toEqual([
        "child",
        "root",
      ]);
    });
  });

  describe("calculateTotalExecutionTime", () => {
    it("returns root stage cumulative time", () => {
      const root = createMockNormalizedStage({
        metrics: { executionTimeMillis: 100 },
        children: [
          createMockNormalizedStage({
            metrics: { executionTimeMillis: 60 },
          }),
          createMockNormalizedStage({
            metrics: { executionTimeMillis: 40 },
          }),
        ],
      });

      expect(calculateTotalExecutionTime(root)).toBe(100);
    });

    it("handles missing execution time on root", () => {
      const root = createMockNormalizedStage({ metrics: {} });

      expect(calculateTotalExecutionTime(root)).toBe(0);
    });
  });

  describe("aggregateFindings", () => {
    it("groups findings correctly", () => {
      const findings: AnalysisFinding[] = [
        {
          id: "f1",
          analyzerId: collscanAntipattern.id,
          severity: "critical",
          category: "performance",
          title: "Test 1",
          description: "Test 1",
          affectedStageIds: ["stage-1"],
        },
        {
          id: "f2",
          analyzerId: lowDocumentEfficiency.id,
          severity: "warning",
          category: "indexUsage",
          title: "Test 2",
          description: "Test 2",
          affectedStageIds: ["stage-1", "stage-2"],
        },
        {
          id: "f3",
          analyzerId: selfTimeAnalysis.id,
          severity: "info",
          category: "optimization",
          title: "Test 3",
          description: "Test 3",
        },
      ];

      const results = aggregateFindings(findings, 3);

      expect(results.summary.totalFindings).toBe(3);
      expect(results.summary.criticalCount).toBe(1);
      expect(results.summary.warningCount).toBe(1);
      expect(results.summary.infoCount).toBe(1);
      expect(results.bySeverity.critical.length).toBe(1);
      expect(results.byCategory.performance.length).toBe(1);
      expect(results.byStageId["stage-1"]!.length).toBe(2);
    });
  });

  describe("getMostSevereFinding", () => {
    it("returns critical over warning and info", () => {
      const findings: AnalysisFinding[] = [
        {
          id: "f1",
          analyzerId: lowDocumentEfficiency.id,
          severity: "info",
          category: "performance",
          title: "Info",
          description: "",
        },
        {
          id: "f2",
          analyzerId: lowDocumentEfficiency.id,
          severity: "critical",
          category: "performance",
          title: "Critical",
          description: "",
        },
        {
          id: "f3",
          analyzerId: lowDocumentEfficiency.id,
          severity: "warning",
          category: "performance",
          title: "Warning",
          description: "",
        },
      ];

      const most = getMostSevereFinding(findings);
      expect(most?.severity).toBe("critical");
    });

    it("returns warning over info", () => {
      const findings: AnalysisFinding[] = [
        {
          id: "f1",
          analyzerId: lowDocumentEfficiency.id,
          severity: "info",
          category: "performance",
          title: "Info",
          description: "",
        },
        {
          id: "f2",
          analyzerId: lowDocumentEfficiency.id,
          severity: "warning",
          category: "performance",
          title: "Warning",
          description: "",
        },
      ];

      const most = getMostSevereFinding(findings);
      expect(most?.severity).toBe("warning");
    });

    it("returns undefined for empty array", () => {
      expect(getMostSevereFinding([])).toBeUndefined();
    });
  });
});
