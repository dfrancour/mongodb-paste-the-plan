/**
 * Format resolver: Sharded find queries.
 *
 * Matches plans where queryPlanner.winningPlan has a shards array
 * (stage: "SHARD_MERGE" or "SINGLE_SHARD" with per-shard plans).
 *
 * The execution root is the top-level SHARD_MERGE stage from
 * executionStats.executionStages — normalization handles expanding
 * the per-shard stages into SHARD_EXECUTION children.
 */
import type {
  ExplainPlan,
  ExecutionStage,
  PlanStage,
} from "#types/explain-plan";
import type { FormatResolution } from "./types";
import { selectPrimaryShard } from "./shardSelection";

export function resolveShardedFind(plan: ExplainPlan): FormatResolution | null {
  // Sharded find: winningPlan.shards exists (array format)
  if (!plan.queryPlanner?.winningPlan?.shards) return null;

  // Plan root: extract from primary shard's winningPlan
  const planRoot = findPlanRoot(plan);

  // Execution root: the top-level executionStages IS the root
  // (contains stage: "SHARD_MERGE" with shards[] inside it)
  const executionRoot =
    (plan.executionStats?.executionStages as ExecutionStage | undefined) ??
    null;

  if (!planRoot && !executionRoot) return null;

  return { planRoot, executionRoot };
}

function findPlanRoot(plan: ExplainPlan): PlanStage | null {
  if (!plan.queryPlanner?.winningPlan?.shards) return null;

  const primaryShard = selectPrimaryShard(plan.queryPlanner.winningPlan.shards);
  if (
    primaryShard &&
    typeof primaryShard === "object" &&
    "winningPlan" in primaryShard
  ) {
    return primaryShard.winningPlan as PlanStage;
  }

  return null;
}
