/**
 * Format resolver: Modern sharded aggregation (MongoDB 6.0+, 8.0+ with Atlas Search).
 *
 * Matches plans where `shards` is a record (object keyed by shard name),
 * not an array. Each shard entry can contain a stages array or
 * queryPlanner/executionStats.
 */
import type {
  ExplainPlan,
  ExecutionStage,
  PlanStage,
} from "#types/explain-plan";
import type { FormatResolution } from "./types";
import { selectPrimaryShardFromRecord } from "./shardSelection";
import { getCursorContent } from "../cursorExtractor";
import { extractPlanRoot } from "./winningPlanExtractor";
import { isExecutionStage } from "#lib/utils/jsxUtils";

export function resolveShardedAggregation(
  plan: ExplainPlan,
): FormatResolution | null {
  if (
    !plan.shards ||
    typeof plan.shards !== "object" ||
    Array.isArray(plan.shards)
  ) {
    return null;
  }

  const primaryShard = selectPrimaryShardFromRecord(plan.shards);
  if (!primaryShard) return null;

  const planRoot = findPlanRoot(primaryShard);
  const executionRoot = findExecutionRoot(primaryShard);

  if (!planRoot && !executionRoot) return null;

  return { planRoot, executionRoot };
}

function findPlanRoot(shard: Record<string, unknown>): PlanStage | null {
  // Format A: Sharded aggregation pipeline (stages array format)
  if ("stages" in shard && Array.isArray(shard.stages)) {
    const stages = shard.stages as Array<Record<string, unknown>>;
    if (stages.length > 0) {
      const shardCursorContent = getCursorContent(stages[0]);
      if (shardCursorContent?.queryPlanner?.winningPlan) {
        return shardCursorContent.queryPlanner.winningPlan as PlanStage;
      }
      return stages[0] as PlanStage;
    }
  }

  // Format B: Sharded aggregation with queryPlanner.winningPlan
  if (shard.queryPlanner && typeof shard.queryPlanner === "object") {
    const queryPlanner = shard.queryPlanner as Record<string, unknown>;
    if ("winningPlan" in queryPlanner && queryPlanner.winningPlan) {
      return extractPlanRoot(
        queryPlanner.winningPlan as Record<string, unknown>,
      );
    }
  }

  return null;
}

function findExecutionRoot(
  shard: Record<string, unknown>,
): ExecutionStage | null {
  // Format A: Sharded aggregation pipeline (stages array format)
  if ("stages" in shard && Array.isArray(shard.stages)) {
    const stages = shard.stages as Array<Record<string, unknown>>;
    if (stages.length > 0) {
      const shardCursorContent = getCursorContent(stages[0]);
      if (shardCursorContent?.executionStats?.executionStages) {
        return shardCursorContent.executionStats.executionStages;
      }
      for (const stage of stages) {
        if (isExecutionStage(stage)) {
          return stage as ExecutionStage;
        }
      }
    }
  }

  // Format B: Sharded aggregation with executionStats.executionStages
  if (shard.executionStats && typeof shard.executionStats === "object") {
    const executionStats = shard.executionStats as Record<string, unknown>;
    if ("executionStages" in executionStats && executionStats.executionStages) {
      return executionStats.executionStages as ExecutionStage;
    }
  }

  return null;
}
