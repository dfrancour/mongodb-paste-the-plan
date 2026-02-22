/**
 * Format resolver: Standard find query.
 *
 * Matches plans with queryPlanner.winningPlan (the most common format).
 * Handles both classic and SBE (queryPlan wrapper) variants.
 */
import type { ExplainPlan, ExecutionStage } from "#types/explain-plan";
import type { FormatResolution } from "./types";
import { extractPlanRoot } from "./winningPlanExtractor";

export function resolveStandardFind(
  plan: ExplainPlan,
): FormatResolution | null {
  if (!plan.queryPlanner?.winningPlan) return null;

  // Skip if this is a sharded find (has shards array in winningPlan)
  if (plan.queryPlanner.winningPlan.shards) return null;

  const planRoot = extractPlanRoot(plan.queryPlanner.winningPlan);

  const executionRoot =
    (plan.executionStats?.executionStages as ExecutionStage | undefined) ??
    null;

  return { planRoot, executionRoot };
}
