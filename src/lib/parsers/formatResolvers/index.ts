/**
 * Format resolution chain.
 *
 * Tries each resolver in priority order. The first resolver that matches
 * extracts plan/execution roots and returns them. When MongoDB adds a new
 * explain format, add one file and one entry in this chain.
 */
import type { ExplainPlan } from "#types/explain-plan";
import type { FormatResolution, FormatResolver } from "./types";
import { PlanParseError } from "../errors";
import { resolveAggregationPipeline } from "./aggregationPipeline";
import { resolveStandardFind } from "./standardFind";
import { resolveShardedFind } from "./shardedFind";
import { resolveShardedAggregation } from "./shardedAggregation";
import { resolveDirectStage } from "./directStage";

export type { FormatResolution } from "./types";

const resolvers: readonly FormatResolver[] = [
  resolveAggregationPipeline, // Must be first: stages[].$cursor wraps other formats
  resolveStandardFind, // queryPlanner.winningPlan (most common)
  resolveShardedFind, // executionStats.executionStages.shards[]
  resolveShardedAggregation, // shards.{name} (MongoDB 6.0+)
  resolveDirectStage, // plan.stage (bare stage, least common)
];

export function resolveFormat(plan: ExplainPlan): FormatResolution {
  for (const resolve of resolvers) {
    const result = resolve(plan);
    if (result) return result;
  }

  throw new PlanParseError(
    "Unrecognized MongoDB explain format: could not extract plan or execution stages",
    undefined,
    "invalid",
  );
}

// Re-export shard selection for use by normalization (SHARD_EXECUTION injection)
// and detection modules
export {
  selectPrimaryShard,
  selectPrimaryShardFromRecord,
} from "./shardSelection";
