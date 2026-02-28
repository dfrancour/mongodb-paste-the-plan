/**
 * Format resolver: Bare aggregation pipeline (no cursor stage).
 *
 * Matches plans with a stages[] array where the first stage is a pipeline
 * operator (e.g., $queue from $documents) rather than a cursor-type stage
 * ($cursor, $geoNearCursor). These plans have no queryPlanner or
 * executionStats wrappers — execution metrics appear inline on each stage.
 *
 * Synthesizes a root stage from the first pipeline operator so the
 * normalization pipeline can process it.
 */
import type {
  ExplainPlan,
  ExecutionStage,
  PlanStage,
} from "#types/explain-plan";
import type { FormatResolution } from "./types";
import { getCursorContentFromPlan } from "../cursorExtractor";

export function resolveBarePipeline(
  plan: ExplainPlan,
): FormatResolution | null {
  if (!plan.stages || !Array.isArray(plan.stages) || plan.stages.length === 0) {
    return null;
  }

  // If the aggregationPipeline resolver would handle this (has cursor content), skip
  if (getCursorContentFromPlan(plan)) return null;

  const firstStage = plan.stages[0] as Record<string, unknown>;
  const stageKey = Object.keys(firstStage).find((k) => k.startsWith("$"));

  if (!stageKey) return null;

  // Synthesize a stage name: "$queue" → "QUEUE"
  const syntheticStageName = stageKey.slice(1).toUpperCase();

  const hasMetrics =
    "nReturned" in firstStage || "executionTimeMillisEstimate" in firstStage;

  if (hasMetrics) {
    return {
      planRoot: null,
      executionRoot: {
        stage: syntheticStageName,
        ...firstStage,
      } as unknown as ExecutionStage,
    };
  }

  return {
    planRoot: {
      stage: syntheticStageName,
      ...firstStage,
    } as unknown as PlanStage,
    executionRoot: null,
  };
}
