/**
 * Generate a summary of the explain plan.
 *
 * IMPORTANT: MongoDB provides pre-computed cumulative metrics in executionStats.
 * We use those totals instead of summing per-stage metrics (which would be incorrect).
 *
 * Traverses the tree only for:
 * - Counting total stages
 * - Detecting stage types (IXSCAN, COLLSCAN)
 */
import type { ExplainPlan, NormalizedStage } from "#types/explain-plan";
import { StageCategory } from "#data/stages";

export function summarizePlan(
  normalizedPlan: NormalizedStage,
  originalPlan: ExplainPlan,
): {
  totalStages: number;
  totalDocsExamined: number;
  totalKeysExamined: number;
  totalReturned: number;
  executionTimeMs: number;
  hasIndexScans: boolean;
  hasCollectionScans: boolean;
} {
  const summary = {
    totalStages: 0,
    totalDocsExamined: originalPlan.executionStats?.totalDocsExamined ?? 0,
    totalKeysExamined: originalPlan.executionStats?.totalKeysExamined ?? 0,
    totalReturned: originalPlan.executionStats?.nReturned ?? 0,
    executionTimeMs: (originalPlan.executionStats?.executionTimeMillis ??
      originalPlan.executionStats?.executionTimeMillisEstimate ??
      0) as number,
    hasIndexScans: false,
    hasCollectionScans: false,
  };

  function traverse(stage: NormalizedStage) {
    summary.totalStages++;

    if (stage.category === StageCategory.IndexScan) {
      summary.hasIndexScans = true;
    } else if (stage.category === StageCategory.CollectionScan) {
      summary.hasCollectionScans = true;
    }

    for (const child of stage.children) {
      traverse(child);
    }
  }

  traverse(normalizedPlan);
  return summary;
}
