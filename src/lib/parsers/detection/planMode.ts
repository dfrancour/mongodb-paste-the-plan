/**
 * Detect whether an explain plan contains execution data or just plan structure.
 */
import type { ExplainPlan } from "#types/explain-plan";
import { isExecutionStage } from "#lib/utils/jsxUtils";
import { getCursorContentFromPlan } from "../cursorExtractor";
import { PlanParseError } from "../errors";

export function detectPlanMode(plan: ExplainPlan): "plan" | "execution" {
  // Check if executionStats.executionStages exists (execution mode)
  if (plan.executionStats?.executionStages) {
    return "execution";
  }

  // Check aggregation pipeline format (supports $cursor, $geoNearCursor, etc.)
  const cursorContent = getCursorContentFromPlan(plan);
  if (cursorContent) {
    if (cursorContent.executionStats?.executionStages) {
      return "execution";
    }
    if (cursorContent.queryPlanner?.winningPlan) {
      return "plan";
    }
  }

  // Check direct stage format (has execution metrics)
  if (plan.stage && isExecutionStage(plan)) {
    const planRecord = plan as Record<string, unknown>;
    if (
      "nReturned" in planRecord ||
      "docsExamined" in planRecord ||
      "executionTimeMillis" in planRecord
    ) {
      return "execution";
    }
  }

  // Check sharded find queries
  if (plan.executionStats?.executionStages?.shards) {
    return "execution";
  }

  // Check sharded aggregation formats (MongoDB 6.0+, MongoDB 8.0+ with Atlas Search)
  if (
    plan.shards &&
    typeof plan.shards === "object" &&
    !Array.isArray(plan.shards)
  ) {
    const shardEntries = Object.entries(plan.shards);
    if (shardEntries.length > 0) {
      const [, shardData] = shardEntries[0]!;
      if (shardData && typeof shardData === "object") {
        const shard = shardData as Record<string, unknown>;

        // Check if shard has stages array (sharded aggregation pipeline format)
        if ("stages" in shard && Array.isArray(shard.stages)) {
          const stages = shard.stages as Array<Record<string, unknown>>;
          if (stages.length > 0) {
            const firstStage = stages[0];
            if (
              firstStage &&
              ("nReturned" in firstStage ||
                "executionTimeMillis" in firstStage ||
                "executionTimeMillisEstimate" in firstStage)
            ) {
              return "execution";
            }
          }
          return "plan";
        }

        // Check if shard has execution stats
        if (shard.executionStats && typeof shard.executionStats === "object") {
          const execStats = shard.executionStats as Record<string, unknown>;
          if ("executionStages" in execStats) {
            return "execution";
          }
        }

        // Check if shard has query planner
        if (shard.queryPlanner && typeof shard.queryPlanner === "object") {
          const queryPlanner = shard.queryPlanner as Record<string, unknown>;
          if ("winningPlan" in queryPlanner) {
            return "plan";
          }
        }
      }
    }
  }

  // Check bare aggregation pipeline (no cursor, e.g., $documents)
  if (plan.stages && Array.isArray(plan.stages) && plan.stages.length > 0) {
    const firstStage = plan.stages[0] as Record<string, unknown>;
    if (
      "nReturned" in firstStage ||
      "executionTimeMillisEstimate" in firstStage
    ) {
      return "execution";
    }
    return "plan";
  }

  // Validate that queryPlanner exists before defaulting to 'plan' mode
  if (plan.queryPlanner?.winningPlan) {
    return "plan";
  }

  throw new PlanParseError(
    "Cannot determine plan mode: missing both executionStats.executionStages and queryPlanner.winningPlan",
    undefined,
    "invalid",
  );
}
