import { describe, it, expect } from "vitest";
import { validatePlan, normalizeExecution, normalizePlan } from "#lib/parsers";
import { createStageVisualization } from "#lib/visualization/stageDisplayFormatter";
import {
  runAllAnalyzers,
  summarizePlan,
  analyzePlanSelection,
} from "#lib/analyzers";
import {
  loadTestPlan,
  getStandardQueryPlanPaths,
} from "#test-utils/test-helpers";

describe("Expert-Focused Metrics Extraction", () => {
  it("should extract database-relevant insights over UI implementation details", () => {
    const allTestPlanPaths = getStandardQueryPlanPaths();

    allTestPlanPaths.forEach((planPath) => {
      const plan = loadTestPlan(planPath);
      const parsed = validatePlan(plan);
      const hasExecution =
        planPath.includes("executionStats") ||
        planPath.includes("allPlansExecution");
      const normalized = hasExecution
        ? normalizeExecution(parsed)
        : normalizePlan(parsed);
      const summary = summarizePlan(normalized, parsed);

      // Behavioral expectation: Analysis should include meaningful database metrics
      const hasDatabaseMetrics =
        summary.hasIndexScans !== undefined ||
        summary.hasCollectionScans !== undefined ||
        summary.totalDocsExamined !== undefined ||
        summary.totalKeysExamined !== undefined;
      expect(hasDatabaseMetrics).toBe(true);

      // Behavioral expectation: Should not expose internal layout/UI details
      expect(summary).not.toHaveProperty("containerWidth");
      expect(summary).not.toHaveProperty("svgDimensions");
      expect(summary).not.toHaveProperty("nodePositions");
    });
  });

  it("should identify performance anti-patterns in explain plans", () => {
    const testCases = [
      {
        plan: "basic/collection-scan.executionStats.json",
        expectedAntiPattern: "collection-scan",
      },
      {
        plan: "performance/inefficient-query.executionStats.json",
        expectedAntiPattern: "poor-document-efficiency",
      },
      {
        plan: "performance/sort-without-index.executionStats.json",
        expectedAntiPattern: "in-memory-sort",
      },
    ];

    testCases.forEach(({ plan: planPath, expectedAntiPattern }) => {
      const plan = loadTestPlan(planPath);
      const parsed = validatePlan(plan);
      const normalized = normalizeExecution(parsed);
      const summary = summarizePlan(normalized, parsed);

      // Behavioral expectation: Should detect specific performance issues
      switch (expectedAntiPattern) {
        case "collection-scan":
          expect(summary.hasCollectionScans).toBe(true);
          break;
        case "poor-document-efficiency":
          // Check for poor document efficiency using the root stage metrics (more accurate)
          const rootNReturned = normalized.metrics.nReturned ?? 0;
          const rootDocsExamined = normalized.metrics.docsExamined ?? 0;

          if (rootNReturned > 0 && rootDocsExamined > 0) {
            const rootDocumentEfficiency = rootNReturned / rootDocsExamined;
            expect(rootDocumentEfficiency).toBeLessThan(0.1); // Poor document efficiency
            expect(rootDocsExamined).toBeGreaterThan(rootNReturned * 10); // More examined than returned
          } else {
            // Fallback to checking general inefficiency indicators
            expect(summary.totalDocsExamined).toBeGreaterThan(1000); // Should examine many docs
            expect(summary.executionTimeMs).toBeGreaterThan(100); // Should be slow
          }
          break;
        case "in-memory-sort":
          // Should detect sort operation - check if plan contains SORT stage (case-insensitive)
          function hasSort(stage: typeof normalized): boolean {
            return (
              stage.stage.toUpperCase() === "SORT" ||
              stage.children.some(hasSort)
            );
          }
          expect(hasSort(normalized)).toBe(true);
          break;
      }
    });
  });

  it("should extract meaningful index usage information", () => {
    const indexTestCases = [
      "basic/simple-index-scan.executionStats.json",
      "basic/compound-index.executionStats.json",
      "complex/array-operations.executionStats.json",
    ];

    indexTestCases.forEach((planPath) => {
      const plan = loadTestPlan(planPath);
      const parsed = validatePlan(plan);
      const normalized = normalizeExecution(parsed);

      // Behavioral expectation: Should extract index information
      function findIndexUsage(stage: typeof normalized): string[] {
        const indexes: string[] = [];
        if (stage.stage === "IXSCAN" && stage.structure.indexName) {
          indexes.push(stage.structure.indexName);
        }
        stage.children.forEach((child) => {
          indexes.push(...findIndexUsage(child));
        });
        return indexes;
      }

      const indexNames = findIndexUsage(normalized);
      expect(indexNames.length).toBeGreaterThan(0);

      // Index names should be meaningful strings
      indexNames.forEach((indexName) => {
        expect(typeof indexName).toBe("string");
        expect(indexName.length).toBeGreaterThan(0);
        expect(indexName).not.toBe("undefined");
      });
    });
  });

  it("should provide stage-specific performance insights", () => {
    const plan = loadTestPlan("basic/index-with-fetch.executionStats.json"); // FETCH -> IXSCAN
    const parsed = validatePlan(plan);
    const normalized = normalizeExecution(parsed);
    const analysisResults = runAllAnalyzers({
      explainPlan: plan,
      rootStage: normalized,
    });

    // Analyze each stage for expert insights
    function analyzeAllStages(stage: typeof normalized): Array<{
      stageType: string;
      analysis: ReturnType<typeof createStageVisualization>;
    }> {
      const analyses = [
        {
          stageType: stage.stage,
          analysis: createStageVisualization(stage, analysisResults),
        },
      ];

      stage.children.forEach((child) => {
        analyses.push(...analyzeAllStages(child));
      });

      return analyses;
    }

    const allAnalyses = analyzeAllStages(normalized);

    // Behavioral expectation: Each stage should have meaningful analysis
    allAnalyses.forEach(({ stageType, analysis }) => {
      expect(analysis.performanceLevel).toBeOneOf([
        "optimal",
        "good",
        "warning",
        "critical",
      ]);
      expect(analysis.primaryMetric).toBeDefined();

      // Stage-specific insights should be relevant
      if (stageType === "IXSCAN") {
        // Primary metric is now consistent flow format, check grid metrics for keys
        expect(analysis.primaryMetric).toMatch(/\d+.*→.*\d+/); // Should show flow format
      } else if (stageType === "COLLSCAN") {
        expect(analysis.performanceLevel).toBeOneOf(["warning", "critical"]);
      }
    });
  });

  it("should calculate efficiency metrics for expert analysis", () => {
    const plan = loadTestPlan(
      "performance/inefficient-query.executionStats.json",
    );
    const parsed = validatePlan(plan);
    const normalized = normalizeExecution(parsed);

    // Behavioral expectation: Should calculate document and index efficiency ratios
    function findEfficiencyMetrics(stage: typeof normalized): Array<{
      stage: string;
      efficiency?: { documentEfficiency?: number; indexEfficiency?: number };
    }> {
      const metrics: Array<{
        stage: string;
        efficiency?: { documentEfficiency?: number; indexEfficiency?: number };
      }> = [
        {
          stage: stage.stage,
          efficiency: stage.efficiency,
        },
      ];

      stage.children.forEach((child) => {
        metrics.push(...findEfficiencyMetrics(child));
      });

      return metrics;
    }

    const allMetrics = findEfficiencyMetrics(normalized);
    const metricsWithEfficiency = allMetrics.filter(
      (m): m is typeof m & { efficiency: NonNullable<typeof m.efficiency> } =>
        m.efficiency !== undefined,
    );

    // Should calculate efficiency for stages with sufficient data
    expect(metricsWithEfficiency.length).toBeGreaterThan(0);

    metricsWithEfficiency.forEach(({ stage, efficiency }) => {
      expect(stage).toBeDefined();
      if (efficiency?.documentEfficiency !== undefined) {
        expect(efficiency.documentEfficiency).toBeGreaterThanOrEqual(0);
        expect(efficiency.documentEfficiency).toBeLessThanOrEqual(1);
      }

      if (efficiency?.indexEfficiency !== undefined) {
        expect(efficiency.indexEfficiency).toBeGreaterThanOrEqual(0);
      }
    });
  });

  it("should prioritize execution time and document examination metrics", () => {
    const performancePlans = [
      "performance/inefficient-query.executionStats.json",
      "performance/covered-query.executionStats.json",
    ];

    performancePlans.forEach((planPath) => {
      const plan = loadTestPlan(planPath);
      const parsed = validatePlan(plan);
      const normalized = normalizeExecution(parsed);
      const summary = summarizePlan(normalized, parsed);

      // Behavioral expectation: Summary should include key performance indicators
      expect(typeof summary.executionTimeMs).toBe("number");
      expect(typeof summary.totalDocsExamined).toBe("number");
      expect(typeof summary.totalKeysExamined).toBe("number");
      expect(typeof summary.totalReturned).toBe("number");

      // Should track index vs collection scan usage
      expect(typeof summary.hasIndexScans).toBe("boolean");
      expect(typeof summary.hasCollectionScans).toBe("boolean");

      // Metrics should be non-negative
      expect(summary.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(summary.totalDocsExamined).toBeGreaterThanOrEqual(0);
      expect(summary.totalKeysExamined).toBeGreaterThanOrEqual(0);
      expect(summary.totalReturned).toBeGreaterThanOrEqual(0);
    });
  });

  it("should handle plan selection analysis for expert insights", () => {
    const planWithRejections = loadTestPlan(
      "basic/compound-index.executionStats.json",
    );
    const parsed = validatePlan(planWithRejections);
    const planSelection = analyzePlanSelection(parsed);

    if (planSelection) {
      // Behavioral expectation: Should provide expert-level plan comparison
      expect(planSelection.winningPlan).toBeDefined();
      expect(planSelection.rejectedPlans).toBeDefined();
      expect(planSelection.recommendation).toBeDefined();
      expect(planSelection.insights).toBeDefined();

      // Recommendations should be actionable
      expect(typeof planSelection.recommendation).toBe("string");
      expect(planSelection.recommendation.length).toBeGreaterThan(10);

      // Insights should be educational
      expect(Array.isArray(planSelection.insights)).toBe(true);
      planSelection.insights.forEach((insight) => {
        expect(typeof insight).toBe("string");
        expect(insight.length).toBeGreaterThan(5);
      });
    }
  });

  describe("Regression: Metric Double-Counting Bugs", () => {
    it("should not double-count works/advanced metrics in plan selection", () => {
      // Regression test for extractWorkMetrics() bug
      // Bug: Recursively summed works/advanced from parent and child stages
      // Example: FETCH (works:101) + IXSCAN (works:101) = 202 (WRONG!)
      // Correct: Use root stage value only
      const planWithRejections = loadTestPlan(
        "basic/compound-index.allPlansExecution.json",
      );
      const parsed = validatePlan(planWithRejections);
      const planSelection = analyzePlanSelection(parsed);

      expect(planSelection).toBeDefined();
      if (planSelection) {
        // Apples-to-apples: Both use trial data from allPlansExecution
        // Winning plan trial (allPlansExecution[0]): FETCH (works:101, advanced:101)
        expect(planSelection.winningPlan.metrics.works).toBe(101);
        expect(planSelection.winningPlan.metrics.advanced).toBe(101);

        // First rejected plan trial (allPlansExecution[1]): FETCH (works:101, advanced:43)
        expect(planSelection.rejectedPlans[0]?.metrics.works).toBe(101);
        expect(planSelection.rejectedPlans[0]?.metrics.advanced).toBe(43);

        // Verify we're not getting double-counted values (202 = 101 + 101)
        expect(planSelection.winningPlan.metrics.works).not.toBe(202);
        expect(planSelection.rejectedPlans[0]?.metrics.works).not.toBe(202);
      }
    });

    it("should not double-count docsExamined/keysExamined in summary", () => {
      // Regression test for summarize() bug
      // Bug: Recursively summed metrics from all stages in tree
      // Correct: Use executionStats cumulative totals directly
      const plan = loadTestPlan("basic/compound-index.executionStats.json");
      const parsed = validatePlan(plan);
      const normalized = normalizeExecution(parsed);
      const summary = summarizePlan(normalized, parsed);

      // Expected values from MongoDB executionStats (pre-computed cumulative totals)
      expect(summary.totalDocsExamined).toBe(735);
      expect(summary.totalKeysExamined).toBe(735);
      expect(summary.totalReturned).toBe(735);
      expect(summary.executionTimeMs).toBe(1);

      // Verify we're not getting massively over-counted values
      // (With bug, these would be 1470 = 735 from FETCH + 735 from IXSCAN)
      expect(summary.totalDocsExamined).not.toBe(1470);
      expect(summary.totalKeysExamined).not.toBe(1470);
    });
  });
});
