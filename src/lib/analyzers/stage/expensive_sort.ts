/**
 * Expensive Sort Analyzer
 *
 * Detects SORT stages with high execution time, indicating potentially
 * expensive in-memory sort operations that could benefit from indexing.
 *
 * Sort operations that take significant time typically indicate:
 * - Large datasets being sorted in memory
 * - Missing indexes that could provide sorted results
 * - Sorts that should be pushed to a $sort hint or index
 */

import type { StageMetricsAnalyzer, AnalysisFinding } from "../types";
import { AnalyzerIds } from "../types";
import { StageCategory } from "#data/stages/types";

const ANALYZER_ID = AnalyzerIds.stage("expensive_sort");

/** Thresholds for sort execution time severity levels */
const SORT_TIME_THRESHOLDS = {
  /** Sort taking more than 1000ms is critical */
  critical: 1000,
  /** Sort taking more than 100ms is warning */
  warning: 100,
} as const;

export const expensiveSort: StageMetricsAnalyzer = {
  layer: "stage",
  id: ANALYZER_ID,

  name: "Expensive Sort Detection",
  description:
    "Identifies SORT stages with high execution time that may benefit from index optimization.",
  enabledByDefault: true,

  analyze: (input) => {
    const findings: AnalysisFinding[] = [];
    const { stage } = input;

    // Only analyze sort stages with execution metrics
    if (stage.category !== StageCategory.Sort || !stage.metrics) {
      return findings;
    }

    const executionTime = stage.metrics.executionTimeMillis;

    // Need execution time to analyze
    if (executionTime === undefined) {
      return findings;
    }

    // Determine severity based on execution time
    if (executionTime >= SORT_TIME_THRESHOLDS.critical) {
      findings.push({
        id: `expensive-sort-${stage.id}`,
        analyzerId: ANALYZER_ID,
        severity: "critical",
        category: "performance",
        metricKey: "executionTime",
        title: "Very Expensive Sort Operation",
        description:
          `This sort operation took ${executionTime}ms, which is critically slow. ` +
          "Large in-memory sorts can exhaust memory limits and significantly impact query performance.",
        suggestion:
          "Create an index that matches the sort order to avoid in-memory sorting. " +
          "For compound sorts, ensure the index key order matches the sort specification.",
        affectedStageIds: [stage.id],
        metadata: {
          executionTimeMs: executionTime,
          stageName: stage.stage,
          totalDataSizeSorted: stage.metrics.totalDataSizeSorted,
          memLimit: stage.metrics.memLimit,
          usedDisk: stage.metrics.usedDisk,
        },
      });
    } else if (executionTime >= SORT_TIME_THRESHOLDS.warning) {
      findings.push({
        id: `expensive-sort-${stage.id}`,
        analyzerId: ANALYZER_ID,
        severity: "warning",
        category: "performance",
        metricKey: "executionTime",
        title: "Expensive Sort Operation",
        description:
          `This sort operation took ${executionTime}ms. ` +
          "Consider optimizing with an index to avoid in-memory sorting.",
        suggestion:
          "Create an index that provides the required sort order. " +
          "MongoDB can use indexes to return sorted results without additional sorting.",
        affectedStageIds: [stage.id],
        metadata: {
          executionTimeMs: executionTime,
          stageName: stage.stage,
          totalDataSizeSorted: stage.metrics.totalDataSizeSorted,
          memLimit: stage.metrics.memLimit,
          usedDisk: stage.metrics.usedDisk,
        },
      });
    }

    return findings;
  },
} as const;
