/**
 * Extract execution metrics from a raw stage.
 * Only used when normalizing execution stages (not plan stages).
 */
import type { NormalizedExecutionStage } from "#types/explain-plan";
import type { ExplainStage, WinningPlan } from "#types/explain-plan";
import { getNumericProperty } from "#lib/utils/jsxUtils";

export type ExecutionMetrics = NormalizedExecutionStage["metrics"];

export function extractMetrics(
  stage: ExplainStage | WinningPlan,
): ExecutionMetrics {
  return {
    nReturned: getNumericProperty(stage, "nReturned"),
    docsExamined:
      getNumericProperty(stage, "docsExamined") ??
      getNumericProperty(stage, "totalDocsExamined"),
    keysExamined:
      getNumericProperty(stage, "keysExamined") ??
      getNumericProperty(stage, "totalKeysExamined"),
    executionTimeMillis:
      getNumericProperty(stage, "executionTimeMillis") ??
      getNumericProperty(stage, "executionTimeMillisEstimate"),
    works: getNumericProperty(stage, "works"),
    advanced: getNumericProperty(stage, "advanced"),
    needTime: getNumericProperty(stage, "needTime"),
    needYield: getNumericProperty(stage, "needYield"),
    saveState: getNumericProperty(stage, "saveState"),
    restoreState: getNumericProperty(stage, "restoreState"),
    memLimit: getNumericProperty(stage, "memLimit"),
    totalDataSizeSorted: getNumericProperty(stage, "totalDataSizeSorted"),
    totalDataSizeSortedBytesEstimate: getNumericProperty(
      stage,
      "totalDataSizeSortedBytesEstimate",
    ),
    usedDisk:
      "usedDisk" in stage && typeof stage.usedDisk === "boolean"
        ? stage.usedDisk
        : undefined,
    seeks: getNumericProperty(stage, "seeks"),
    dupsTested: getNumericProperty(stage, "dupsTested"),
    dupsDropped: getNumericProperty(stage, "dupsDropped"),
    alreadyHasObj: getNumericProperty(stage, "alreadyHasObj"),
  };
}

export function calculateEfficiency(
  metrics: ExecutionMetrics,
): { selectivity?: number; indexUsage?: number } | undefined {
  if (
    metrics.nReturned !== undefined &&
    metrics.docsExamined !== undefined &&
    metrics.docsExamined > 0
  ) {
    const efficiency: { selectivity?: number; indexUsage?: number } = {
      selectivity: metrics.nReturned / metrics.docsExamined,
    };
    if (metrics.keysExamined !== undefined && metrics.keysExamined > 0) {
      efficiency.indexUsage = metrics.nReturned / metrics.keysExamined;
    }
    return efficiency;
  }
  return undefined;
}
