import type { PlanStage, WinningPlan } from "#types/explain-plan";

/**
 * Extract the plan root from a winningPlan, handling the queryPlan wrapper
 * used in SBE plans (explainVersion: "2").
 *
 * SBE format:  winningPlan.queryPlan → actual plan tree
 * Classic format: winningPlan → actual plan tree directly
 */
export function extractPlanRoot(
  winningPlan: WinningPlan | Record<string, unknown>,
): PlanStage {
  if ("queryPlan" in winningPlan && winningPlan.queryPlan) {
    return winningPlan.queryPlan as PlanStage;
  }
  return winningPlan as PlanStage;
}
