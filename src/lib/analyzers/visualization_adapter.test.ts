import { describe, it, expect } from "vitest";
import {
  getPerformanceLevelFromFindings,
  getAllWarningsFromFindings,
  hasAnySortStage,
  hasInMemorySortFinding,
  getSortMetrics,
} from "./visualization_adapter";
import { coveredQueryOptimal } from "./stage-definition";
import { lowSelectivity } from "./stage";
import { overallEfficiency, inMemorySort } from "./plan";
import { collscanAntipattern } from "./stage-definition";
import { AnalyzerIds } from "./types";
import { createMockNormalizedStage } from "./test-helpers";
import type { AnalysisFinding, AnalysisResults } from "./types";
import { StageCategory } from "#data/stages/types";

describe("Visualization Adapter", () => {
  describe("getPerformanceLevelFromFindings", () => {
    it("returns 'good' for empty findings", () => {
      expect(getPerformanceLevelFromFindings([])).toBe("good");
    });

    it("returns 'critical' for critical findings", () => {
      const findings: AnalysisFinding[] = [
        {
          id: "f1",
          analyzerId: lowSelectivity.id,
          severity: "critical",
          category: "performance",
          title: "Test",
          description: "Test",
        },
      ];

      expect(getPerformanceLevelFromFindings(findings)).toBe("critical");
    });

    it("returns 'warning' for warning findings", () => {
      const findings: AnalysisFinding[] = [
        {
          id: "f1",
          analyzerId: lowSelectivity.id,
          severity: "warning",
          category: "performance",
          title: "Test",
          description: "Test",
        },
      ];

      expect(getPerformanceLevelFromFindings(findings)).toBe("warning");
    });

    it("returns 'optimal' for covered query findings", () => {
      const findings: AnalysisFinding[] = [
        {
          id: "f1",
          analyzerId: coveredQueryOptimal.id,
          severity: "info",
          category: "optimization",
          title: "Covered Query",
          description: "Test",
        },
      ];

      expect(getPerformanceLevelFromFindings(findings)).toBe("optimal");
    });

    it("returns 'good' for info findings from non-covered-query analyzers", () => {
      const findings: AnalysisFinding[] = [
        {
          id: "f1",
          analyzerId: overallEfficiency.id,
          severity: "info",
          category: "optimization",
          title: "Excellent",
          description: "Test",
        },
      ];

      expect(getPerformanceLevelFromFindings(findings)).toBe("good");
    });
  });

  describe("getAllWarningsFromFindings", () => {
    it("returns only warning and critical findings, sorted critical-first", () => {
      const findings: AnalysisFinding[] = [
        {
          id: "f1",
          analyzerId: lowSelectivity.id,
          severity: "warning",
          category: "performance",
          title: "Warning One",
          description: "Desc",
        },
        {
          id: "f2",
          analyzerId: lowSelectivity.id,
          severity: "info",
          category: "performance",
          title: "Info",
          description: "Desc",
        },
        {
          id: "f3",
          analyzerId: lowSelectivity.id,
          severity: "critical",
          category: "performance",
          title: "Critical One",
          description: "Desc",
        },
      ];

      const warnings = getAllWarningsFromFindings(findings);

      expect(warnings.length).toBe(2);
      expect(warnings[0]!.severity).toBe("critical");
      expect(warnings[0]!.title).toBe("Critical One");
      expect(warnings[1]!.severity).toBe("warning");
    });
  });
});

describe("Sort Detection Utilities", () => {
  describe("hasAnySortStage", () => {
    it("detects sort stage in flat list", () => {
      const stages = [
        createMockNormalizedStage({
          stage: "SORT",
          category: StageCategory.Sort,
        }),
      ];
      expect(hasAnySortStage(stages)).toBe(true);
    });

    it("detects sort stage nested in children", () => {
      const stages = [
        createMockNormalizedStage({
          stage: "FETCH",
          category: StageCategory.Fetch,
          children: [
            createMockNormalizedStage({
              stage: "SORT",
              category: StageCategory.Sort,
            }),
          ],
        }),
      ];
      expect(hasAnySortStage(stages)).toBe(true);
    });

    it("returns false when no sort stages", () => {
      const stages = [
        createMockNormalizedStage({
          stage: "IXSCAN",
          category: StageCategory.IndexScan,
        }),
      ];
      expect(hasAnySortStage(stages)).toBe(false);
    });
  });

  describe("hasInMemorySortFinding", () => {
    function createEmptyResults(
      findings: AnalysisFinding[] = [],
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
        byStageId: {},
        summary: {
          totalFindings: findings.length,
          criticalCount: 0,
          warningCount: 0,
          infoCount: 0,
          analyzerDefinitionsRun: 0,
        },
      };
    }

    it("detects in-memory sort finding by analyzer ID", () => {
      const results = createEmptyResults([
        {
          id: "in-memory-sort-plan",
          analyzerId: inMemorySort.id,
          severity: "info",
          category: "performance",
          title: "In-Memory Sort",
          description: "Test",
        },
      ]);

      expect(hasInMemorySortFinding(results)).toBe(true);
    });

    it("detects in-memory sort finding by finding ID prefix", () => {
      const results = createEmptyResults([
        {
          id: "in-memory-sort-custom",
          analyzerId: AnalyzerIds.plan("other_analyzer"),
          severity: "info",
          category: "performance",
          title: "Sort",
          description: "Test",
        },
      ]);

      expect(hasInMemorySortFinding(results)).toBe(true);
    });

    it("returns false when no sort findings", () => {
      const results = createEmptyResults([
        {
          id: "collscan-1",
          analyzerId: collscanAntipattern.id,
          severity: "critical",
          category: "indexUsage",
          title: "COLLSCAN",
          description: "Test",
        },
      ]);

      expect(hasInMemorySortFinding(results)).toBe(false);
    });
  });

  describe("getSortMetrics", () => {
    it("returns combined sort detection results", () => {
      const stages = [
        createMockNormalizedStage({
          stage: "SORT",
          category: StageCategory.Sort,
        }),
      ];
      const results: AnalysisResults = {
        findings: [
          {
            id: "in-memory-sort-plan",
            analyzerId: inMemorySort.id,
            severity: "info",
            category: "performance",
            title: "Sort",
            description: "Test",
          },
        ],
        bySeverity: { critical: [], warning: [], info: [] },
        byCategory: {
          performance: [],
          indexUsage: [],
          memoryUsage: [],
          queryPattern: [],
          optimization: [],
        },
        byStageId: {},
        summary: {
          totalFindings: 1,
          criticalCount: 0,
          warningCount: 0,
          infoCount: 1,
          analyzerDefinitionsRun: 0,
        },
      };

      const metrics = getSortMetrics(stages, results);
      expect(metrics.hasSort).toBe(true);
      expect(metrics.hasInMemorySort).toBe(true);
    });
  });
});
