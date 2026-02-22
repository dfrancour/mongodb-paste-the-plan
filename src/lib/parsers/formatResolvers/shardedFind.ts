/**
 * Format resolver: Sharded find queries.
 *
 * Matches plans where queryPlanner.winningPlan has a shards array
 * (stage: "SHARD_MERGE" or "SINGLE_SHARD" with per-shard plans).
 *
 * Both plan and execution roots are top-level stages (SHARD_MERGE).
 * Normalization handles expanding per-shard stages into SHARD_EXECUTION
 * children for both plan and execution modes.
 */
import type {
  ExplainPlan,
  ExecutionStage,
  PlanStage,
} from "#types/explain-plan";
import type { FormatResolution } from "./types";

export function resolveShardedFind(plan: ExplainPlan): FormatResolution | null {
  // Sharded find: winningPlan.shards exists (array format)
  if (!plan.queryPlanner?.winningPlan?.shards) return null;

  // Plan root: the SHARD_MERGE/SINGLE_SHARD stage itself.
  // Normalization expands per-shard plans into SHARD_EXECUTION children.
  const planRoot =
    (plan.queryPlanner.winningPlan as PlanStage | undefined) ?? null;

  // Execution root: the top-level executionStages IS the root
  // (contains stage: "SHARD_MERGE" with shards[] inside it)
  const executionRoot =
    (plan.executionStats?.executionStages as ExecutionStage | undefined) ??
    null;

  if (!planRoot && !executionRoot) return null;

  return { planRoot, executionRoot };
}
