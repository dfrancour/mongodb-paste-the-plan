/**
 * Format resolver: Direct stage format.
 *
 * Matches plans where the plan itself IS a stage (has a `stage` field at root).
 * This is the least common format — typically from programmatic extraction.
 */
import type {
  ExplainPlan,
  ExecutionStage,
  PlanStage,
} from "#types/explain-plan";
import type { FormatResolution } from "./types";
import { isExecutionStage } from "#lib/utils/jsxUtils";

export function resolveDirectStage(plan: ExplainPlan): FormatResolution | null {
  if (!plan.stage) return null;
  if (!isExecutionStage(plan)) return null;

  const planRecord = plan as Record<string, unknown>;
  const hasExecutionMetrics =
    "nReturned" in planRecord ||
    "docsExamined" in planRecord ||
    "executionTimeMillis" in planRecord;

  if (hasExecutionMetrics) {
    return {
      planRoot: null,
      executionRoot: plan as unknown as ExecutionStage,
    };
  }

  return {
    planRoot: plan as unknown as PlanStage,
    executionRoot: null,
  };
}
