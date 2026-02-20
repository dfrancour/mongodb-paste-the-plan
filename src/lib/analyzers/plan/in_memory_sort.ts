/**
 * In-Memory Sort Analyzer
 *
 * Plan-level analyzer that detects when sorts are being performed in memory
 * rather than using an index. In-memory sorts:
 * - Have memory limits (default 100MB)
 * - Can spill to disk when limits are exceeded
 * - Are generally slower than index-based sorts
 *
 * This analyzer examines the entire plan to find sort stages with
 * in-memory characteristics.
 */

import type { PlanAnalyzer, AnalysisFinding } from "../types";
import { AnalyzerIds } from "../types";
import { StageCategory } from "#data/stages/types";
import type { NormalizedStage } from "#types/explain-plan";

export const IN_MEMORY_SORT_ANALYZER_ID = AnalyzerIds.plan("in_memory_sort");

/**
 * Determine if a stage represents an in-memory sort operation.
 */
function isInMemorySortStage(stage: NormalizedStage): boolean {
  if (stage.category !== StageCategory.Sort || !stage.metrics) {
    return false;
  }

  const { metrics } = stage;

  // Clear indicators of in-memory sorting
  if (
    metrics.totalDataSizeSorted !== undefined &&
    metrics.totalDataSizeSorted > 0
  ) {
    return true;
  }

  // Memory limit set suggests potential memory usage for sorting
  if (metrics.memLimit !== undefined && metrics.memLimit > 0) {
    return true;
  }

  // Aggregation stages with sorting metrics
  if (
    metrics.totalDataSizeSortedBytesEstimate !== undefined &&
    metrics.totalDataSizeSortedBytesEstimate > 0
  ) {
    return true;
  }

  // If usedDisk is explicitly false but we have a sort with memLimit, it's in-memory
  if (metrics.usedDisk === false && metrics.memLimit !== undefined) {
    return true;
  }

  return false;
}

/**
 * Filter in-memory sort stages from a flat stage list.
 * allStages is pre-flattened by runAllAnalyzers, so no recursion needed.
 */
function findInMemorySortStages(stages: NormalizedStage[]): NormalizedStage[] {
  return stages.filter(isInMemorySortStage);
}

/** Finding ID prefix used by this analyzer */
export const IN_MEMORY_SORT_FINDING_PREFIX = "in-memory-sort";

export const inMemorySort: PlanAnalyzer = {
  layer: "plan",
  id: IN_MEMORY_SORT_ANALYZER_ID,

  name: "In-Memory Sort Detection",
  description:
    "Detects sort operations that are performed in memory rather than using an index.",
  enabledByDefault: true,

  analyze: (input) => {
    const findings: AnalysisFinding[] = [];
    const { allStages } = input;

    // Find all in-memory sort stages
    const inMemorySorts = findInMemorySortStages(allStages);

    if (inMemorySorts.length === 0) {
      return findings;
    }

    // Create a finding for in-memory sorts
    const affectedStageIds = inMemorySorts.map((s) => s.id);
    const usedDiskAny = inMemorySorts.some((s) => s.metrics?.usedDisk === true);
    const totalDataSorted = inMemorySorts.reduce(
      (sum, s) =>
        sum +
        (s.metrics?.totalDataSizeSorted ??
          s.metrics?.totalDataSizeSortedBytesEstimate ??
          0),
      0,
    );

    // Determine severity based on disk usage
    const severity = usedDiskAny ? "warning" : "info";

    findings.push({
      id: `in-memory-sort-plan`,
      analyzerId: IN_MEMORY_SORT_ANALYZER_ID,
      severity,
      category: "performance",
      title: usedDiskAny ? "Sort Spilled to Disk" : "In-Memory Sort Detected",
      description: usedDiskAny
        ? `This query has ${inMemorySorts.length} sort operation(s) that exceeded memory limits and spilled to disk. ` +
          "Disk-based sorting is significantly slower than in-memory sorting."
        : `This query has ${inMemorySorts.length} sort operation(s) performed in memory. ` +
          "Consider using an index to avoid in-memory sorting for better performance.",
      suggestion:
        "Create an index that matches the sort order. " +
        "MongoDB can use indexes to return results in sorted order without additional sorting. " +
        "For compound sorts, ensure the index key order matches the sort specification.",
      affectedStageIds,
      metadata: {
        sortStageCount: inMemorySorts.length,
        usedDisk: usedDiskAny,
        totalDataSortedBytes: totalDataSorted,
        sortStages: inMemorySorts.map((s) => ({
          stageId: s.id,
          stageName: s.stage,
          dataSizeSorted:
            s.metrics?.totalDataSizeSorted ??
            s.metrics?.totalDataSizeSortedBytesEstimate,
          memLimit: s.metrics?.memLimit,
          usedDisk: s.metrics?.usedDisk,
        })),
      },
    });

    return findings;
  },
} as const;
