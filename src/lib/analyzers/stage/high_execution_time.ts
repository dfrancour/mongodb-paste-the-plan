/**
 * High Execution Time Analyzer
 *
 * Detects stages that consume a disproportionate amount of the total
 * query execution time. This helps identify bottlenecks in the plan.
 *
 * A stage is flagged when:
 * - It takes more than a threshold percentage of total time
 * - Its absolute time exceeds a minimum threshold (to avoid noise)
 */

import type {
  StageMetricsAnalyzer,
  AnalysisFinding,
  FindingSeverity,
} from "../types";
import { AnalyzerIds } from "../types";

const ANALYZER_ID = AnalyzerIds.stage("high_execution_time");

/** Thresholds for execution time severity levels */
const TIME_THRESHOLDS = {
  /** Stage consuming more than this % of total time is critical */
  criticalPercentage: 80,
  /** Stage consuming more than this % of total time is warning */
  warningPercentage: 50,
  /** Minimum absolute time (ms) to trigger analysis (avoid noise on fast queries) */
  minAbsoluteTimeMs: 10,
  /** Minimum total execution time (ms) to calculate percentages */
  minTotalTimeMs: 5,
} as const;

export const highExecutionTime: StageMetricsAnalyzer = {
  layer: "stage",
  id: ANALYZER_ID,

  name: "High Execution Time Detection",
  description:
    "Identifies stages that consume a disproportionate amount of execution time.",
  enabledByDefault: true,

  analyze: (input) => {
    const findings: AnalysisFinding[] = [];
    const { stage, totalExecutionTime } = input;

    if (!stage.metrics) return findings;

    const stageTime = stage.metrics.executionTimeMillis;

    // Need both metrics to calculate percentage
    if (stageTime === undefined || totalExecutionTime === undefined) {
      return findings;
    }

    // Skip if times are too small (avoid noise)
    if (
      stageTime < TIME_THRESHOLDS.minAbsoluteTimeMs ||
      totalExecutionTime < TIME_THRESHOLDS.minTotalTimeMs
    ) {
      return findings;
    }

    const percentage = (stageTime / totalExecutionTime) * 100;

    // Determine severity based on percentage
    let severity: FindingSeverity;
    if (percentage >= TIME_THRESHOLDS.criticalPercentage) {
      severity = "critical";
    } else if (percentage >= TIME_THRESHOLDS.warningPercentage) {
      severity = "warning";
    } else {
      // Time percentage is acceptable
      return findings;
    }

    findings.push({
      id: `high-execution-time-${stage.id}`,
      analyzerId: ANALYZER_ID,
      severity,
      category: "performance",
      metricKey: "executionTime",
      title: "High Execution Time",
      description:
        `This stage (${stage.stage}) consumed ${stageTime}ms (${percentage.toFixed(1)}% of total ${totalExecutionTime}ms). ` +
        "This stage is a potential bottleneck.",
      suggestion:
        severity === "critical"
          ? "This stage dominates execution time. Focus optimization efforts here. " +
            "Check if better indexes can reduce work, or if the operation can be restructured."
          : "This stage is consuming significant time. Review its configuration and consider optimization.",
      affectedStageIds: [stage.id],
      metadata: {
        stageTimeMs: stageTime,
        totalTimeMs: totalExecutionTime,
        percentageOfTotal: parseFloat(percentage.toFixed(1)),
        stageName: stage.stage,
      },
    });

    return findings;
  },
} as const;
