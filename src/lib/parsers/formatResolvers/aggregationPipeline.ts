/**
 * Format resolver: Aggregation pipeline with cursor-type stage.
 *
 * Matches plans with a stages[] array containing $cursor, $geoNearCursor, etc.
 * Uses structure-based detection (not name-based) to support future cursor types.
 */
import type { ExplainPlan, ExecutionStage } from "#types/explain-plan";
import type { FormatResolution } from "./types";
import { getCursorContentFromPlan } from "../cursorExtractor";
import { extractPlanRoot } from "./winningPlanExtractor";

export function resolveAggregationPipeline(
  plan: ExplainPlan,
): FormatResolution | null {
  const cursorContent = getCursorContentFromPlan(plan);
  if (!cursorContent) return null;

  const winningPlan = cursorContent.queryPlanner?.winningPlan;
  const planRoot = winningPlan ? extractPlanRoot(winningPlan) : null;

  const executionRoot =
    (cursorContent.executionStats?.executionStages as
      | ExecutionStage
      | undefined) ?? null;

  if (!planRoot && !executionRoot) return null;

  return { planRoot, executionRoot };
}
