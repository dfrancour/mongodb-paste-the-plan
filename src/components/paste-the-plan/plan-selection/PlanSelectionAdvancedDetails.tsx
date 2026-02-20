"use client";

import { TrendingUp } from "lucide-react";
import type { PlanSelectionAnalysis } from "#types/explain-plan";

interface PlanSelectionAdvancedDetailsProps {
  readonly analysis: PlanSelectionAnalysis;
}

/**
 * Advanced details for plan selection analysis
 *
 * Contains MongoDB internals like optimizer metrics, cache info, and planner limits.
 * This information is valuable but not essential for basic query tuning.
 */
export function PlanSelectionAdvancedDetails({
  analysis,
}: PlanSelectionAdvancedDetailsProps) {
  // Check if we have any advanced details to show
  const hasOptimizerInfo =
    analysis.optimizationTimeMillis !== undefined ||
    Boolean(analysis.plannerLimits?.maxIndexedOrSolutionsReached) ||
    Boolean(analysis.plannerLimits?.maxIndexedAndSolutionsReached) ||
    Boolean(analysis.plannerLimits?.maxScansToExplodeReached);

  const hasCacheInfo =
    Boolean(analysis.cacheInfo) &&
    (Boolean(analysis.cacheInfo?.queryHash) ||
      Boolean(analysis.cacheInfo?.planCacheKey) ||
      analysis.cacheInfo?.isCached !== undefined);

  const hasIndexInfo =
    Boolean(analysis.queryPlannerInfo) &&
    (analysis.queryPlannerInfo?.indexFilterSet !== undefined ||
      analysis.queryPlannerInfo?.prunedSimilarIndexes !== undefined);

  if (!hasOptimizerInfo && !hasCacheInfo && !hasIndexInfo) {
    return null;
  }

  return (
    <div className="container-secondary">
      <h4 className="header-card mb-3 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        MongoDB Internals
      </h4>

      <div className="space-y-2 text-xs">
        {/* Optimizer Metrics */}
        {analysis.optimizationTimeMillis !== undefined && (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">
              <code className="text-xs">
                queryPlanner.optimizationTimeMillis
              </code>
              :
            </span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              {analysis.optimizationTimeMillis}ms
            </span>
          </div>
        )}

        {analysis.plannerLimits?.maxIndexedOrSolutionsReached && (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">
              <code className="text-xs break-all">
                queryPlanner.maxIndexedOrSolutionsReached
              </code>
              :
            </span>
            <span className="font-medium text-yellow-600 dark:text-yellow-400">
              true
            </span>
          </div>
        )}

        {analysis.plannerLimits?.maxIndexedAndSolutionsReached && (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">
              <code className="text-xs break-all">
                queryPlanner.maxIndexedAndSolutionsReached
              </code>
              :
            </span>
            <span className="font-medium text-yellow-600 dark:text-yellow-400">
              true
            </span>
          </div>
        )}

        {analysis.plannerLimits?.maxScansToExplodeReached && (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">
              <code className="text-xs break-all">
                queryPlanner.maxScansToExplodeReached
              </code>
              :
            </span>
            <span className="font-medium text-yellow-600 dark:text-yellow-400">
              true
            </span>
          </div>
        )}

        {/* Index Selection Factors */}
        {analysis.queryPlannerInfo?.indexFilterSet !== undefined && (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">
              <code className="text-xs">queryPlanner.indexFilterSet</code>:
            </span>
            <span
              className={`font-medium ${
                analysis.queryPlannerInfo.indexFilterSet
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-neutral-500 dark:text-neutral-400"
              }`}
            >
              {analysis.queryPlannerInfo.indexFilterSet.toString()}
            </span>
          </div>
        )}

        {analysis.queryPlannerInfo?.prunedSimilarIndexes !== undefined && (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">
              <code className="text-xs break-all">
                queryPlanner.prunedSimilarIndexes
              </code>
              :
            </span>
            <span
              className={`font-medium ${
                analysis.queryPlannerInfo.prunedSimilarIndexes
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-neutral-500 dark:text-neutral-400"
              }`}
            >
              {analysis.queryPlannerInfo.prunedSimilarIndexes.toString()}
            </span>
          </div>
        )}

        {/* Cache Information */}
        {analysis.cacheInfo?.isCached !== undefined && (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">
              <code className="text-xs break-all">
                queryPlanner.winningPlan.isCached
              </code>
              :
            </span>
            <span
              className={`w-fit rounded px-1.5 py-0.5 font-medium ${
                analysis.cacheInfo.isCached
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                  : "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
              }`}
            >
              {analysis.cacheInfo.isCached
                ? "true (Cache Hit)"
                : "false (Fresh Planning)"}
            </span>
          </div>
        )}

        {analysis.cacheInfo?.planCacheKey && (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">
              <code className="text-xs">queryPlanner.planCacheKey</code>:
            </span>
            <code className="w-fit rounded bg-neutral-100 px-1 py-0.5 font-mono text-xs break-all dark:bg-neutral-700">
              {analysis.cacheInfo.planCacheKey}
            </code>
          </div>
        )}

        {analysis.cacheInfo?.queryHash && (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">
              <code className="text-xs">queryPlanner.queryHash</code>:
            </span>
            <code className="w-fit rounded bg-neutral-100 px-1 py-0.5 font-mono text-xs break-all dark:bg-neutral-700">
              {analysis.cacheInfo.queryHash}
            </code>
          </div>
        )}

        {analysis.cacheInfo?.planCacheShapeHash && (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">
              <code className="text-xs break-all">
                queryPlanner.planCacheShapeHash
              </code>
              :
            </span>
            <code className="w-fit rounded bg-neutral-100 px-1 py-0.5 font-mono text-xs break-all dark:bg-neutral-700">
              {analysis.cacheInfo.planCacheShapeHash}
            </code>
          </div>
        )}

        {analysis.cacheInfo?.queryShapeHash && (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">
              <code className="text-xs">queryShapeHash</code>:
            </span>
            <code className="w-fit rounded bg-neutral-100 px-1 py-0.5 font-mono text-xs break-all dark:bg-neutral-700">
              {analysis.cacheInfo.queryShapeHash}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}
