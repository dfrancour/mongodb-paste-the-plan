/**
 * Detect execution engine type from an explain plan.
 */
import type { ExplainPlan } from "#types/explain-plan";

/** Check if this is an SBE plan (explainVersion: "2") */
export function isSBEPlan(plan: ExplainPlan): boolean {
  return plan.explainVersion === "2";
}
