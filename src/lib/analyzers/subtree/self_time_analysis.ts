/**
 * Self Time Analysis Analyzer
 *
 * Calculates and analyzes the "self time" of each stage - the time spent
 * executing the stage's own work, excluding time spent in child stages.
 *
 * For sequential children (default):
 *   selfTime = stage.executionTimeMillis - sum(children.executionTimeMillis)
 *
 * For parallel children (e.g., sharded queries where children run on separate shards):
 *   selfTime = stage.executionTimeMillis - max(children.executionTimeMillis)
 *
 * This helps identify stages that are doing expensive work themselves,
 * separate from the work done by their children.
 *
 * High self time stages are often:
 * - SORT (sorting data in memory)
 * - GROUP (aggregating data)
 * - FETCH (fetching documents from disk)
 * - Stages doing complex filtering or projection
 */

import type { NormalizedStage } from "#types/explain-plan";
import type {
  SubtreeAnalyzer,
  AnalysisFinding,
  FindingSeverity,
} from "../types";
import { AnalyzerIds } from "../types";

/**
 * Walks the stage tree and computes `selfTimeMillis` on every node.
 *
 * - Leaf nodes: selfTimeMillis = executionTimeMillis
 * - Sequential parents: selfTimeMillis = executionTimeMillis - sum(children.executionTimeMillis)
 * - Parallel parents (hasParallelChildren): selfTimeMillis = executionTimeMillis - max(children.executionTimeMillis)
 * - Clamped to 0 (clock rounding can produce small negatives)
 * - Skipped when executionTimeMillis is undefined (plan-only mode)
 *
 * Mutates the tree in place — call once after parsing, before analysis.
 */
export function calculateSelfTime(root: NormalizedStage): void {
  // Recurse children first (post-order) so children have their times set
  for (const child of root.children) {
    calculateSelfTime(child);
  }

  // Plan-only stages have no metrics
  if (!root.metrics) return;

  const stageTime = root.metrics.executionTimeMillis;
  if (stageTime === undefined) {
    return;
  }

  if (root.children.length === 0) {
    root.metrics.selfTimeMillis = stageTime;
  } else {
    const childrenTime = root.definition?.hasParallelChildren
      ? Math.max(
          ...root.children.map((c) => c.metrics?.executionTimeMillis ?? 0),
        )
      : root.children.reduce(
          (sum, child) => sum + (child.metrics?.executionTimeMillis ?? 0),
          0,
        );
    root.metrics.selfTimeMillis = Math.max(0, stageTime - childrenTime);
  }
}

const ANALYZER_ID = AnalyzerIds.subtree("self_time_analysis");

/** Thresholds for self time severity levels (absolute milliseconds) */
const SELF_TIME_THRESHOLDS = {
  /** Self time above this is critical */
  criticalMs: 500,
  /** Self time above this is warning */
  warningMs: 100,
} as const;

export const selfTimeAnalysis: SubtreeAnalyzer = {
  layer: "subtree",
  id: ANALYZER_ID,

  name: "Self Time Analysis",
  description:
    "Identifies stages with high self time (time spent in the stage itself, excluding children).",
  enabledByDefault: true,

  analyze: (input) => {
    const findings: AnalysisFinding[] = [];
    const { stage, children, totalExecutionTime } = input;

    if (!stage.metrics) return findings;

    const selfTime = stage.metrics.selfTimeMillis;
    const stageTime = stage.metrics.executionTimeMillis;

    // Need pre-computed self time (set by calculateSelfTime before analysis)
    if (selfTime === undefined || stageTime === undefined) {
      return findings;
    }

    const childrenTime = stageTime - selfTime;

    // Determine severity based on absolute self time
    let severity: FindingSeverity;
    if (selfTime >= SELF_TIME_THRESHOLDS.criticalMs) {
      severity = "critical";
    } else if (selfTime >= SELF_TIME_THRESHOLDS.warningMs) {
      severity = "warning";
    } else {
      return findings;
    }

    // Provide context about what this stage does
    const stageContext = getStageSelfTimeContext(stage.stage);

    findings.push({
      id: `high-self-time-${stage.id}`,
      analyzerId: ANALYZER_ID,
      severity,
      category: "performance",
      title: "High Self Time",
      description:
        `Stage ${stage.stage} spent ${selfTime}ms on its own work, ` +
        `excluding ${childrenTime}ms in child stages. ${stageContext}`,
      suggestion: getStageSelfTimeSuggestion(stage.stage, severity),
      affectedStageIds: [stage.id],
      metadata: {
        selfTimeMs: selfTime,
        stageTimeMs: stageTime,
        childrenTimeMs: childrenTime,
        totalTimeMs: totalExecutionTime,
        stageName: stage.stage,
        childCount: children.length,
      },
    });

    return findings;
  },
} as const;

/**
 * Get contextual information about what causes self time in different stage types.
 */
function getStageSelfTimeContext(stageName: string): string {
  const upperName = stageName.toUpperCase();

  if (upperName.includes("SORT")) {
    return "SORT stages spend self time organizing documents in memory or on disk.";
  }
  if (upperName.includes("GROUP") || upperName.includes("AGG")) {
    return "Aggregation stages spend self time computing aggregations and maintaining accumulators.";
  }
  if (upperName.includes("FETCH")) {
    return "FETCH stages spend self time retrieving document data from storage.";
  }
  if (upperName.includes("COLLSCAN") || upperName.includes("SCAN")) {
    return "Scan stages spend self time reading and filtering documents.";
  }
  if (upperName.includes("PROJECT")) {
    return "Projection stages spend self time reshaping documents.";
  }
  if (upperName.includes("FILTER")) {
    return "Filter stages spend self time evaluating filter conditions.";
  }

  return "This stage is performing significant work.";
}

/**
 * Get optimization suggestions based on stage type and severity.
 */
function getStageSelfTimeSuggestion(
  stageName: string,
  severity: FindingSeverity,
): string {
  const upperName = stageName.toUpperCase();

  if (upperName.includes("SORT")) {
    return severity === "critical"
      ? "This sort is dominating query time. Consider creating an index that provides the sort order, " +
          "or use allowDiskUse if hitting memory limits."
      : "Consider if an index could provide pre-sorted results.";
  }

  if (upperName.includes("GROUP") || upperName.includes("AGG")) {
    return severity === "critical"
      ? "Aggregation is the bottleneck. Consider pre-aggregating data, using more selective filters " +
          "before grouping, or restructuring the pipeline."
      : "Review if filters can be applied earlier to reduce the data being aggregated.";
  }

  if (upperName.includes("FETCH")) {
    return severity === "critical"
      ? "Document fetch is slow. This may indicate slow storage, large documents, or data not in cache. " +
          "Consider a covered query (projection using only indexed fields) to avoid fetching."
      : "Consider if all fetched fields are needed, or if a covered query is possible.";
  }

  if (upperName.includes("COLLSCAN") || upperName.includes("SCAN")) {
    return severity === "critical"
      ? "Scan is dominating time. Add an index to avoid full collection scans."
      : "Review if an index could reduce the scan scope.";
  }

  return severity === "critical"
    ? "This stage is the primary bottleneck. Focus optimization efforts here."
    : "Review this stage for optimization opportunities.";
}
