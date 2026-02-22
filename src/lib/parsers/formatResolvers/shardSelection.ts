/**
 * Shard selection heuristics for choosing a representative shard from sharded queries.
 * Used by both shardedFind and shardedAggregation resolvers.
 */

/** Select primary shard from array format (sharded find queries) */
export function selectPrimaryShard(
  shards: unknown[],
): Record<string, unknown> | null {
  let primaryShard: Record<string, unknown> | null = null;
  let maxActivity = 0;

  for (const shard of shards) {
    if (!shard || typeof shard !== "object") continue;

    const shardObj = shard as Record<string, unknown>;
    const activity = calculateShardActivity(shardObj);

    if (activity > maxActivity || primaryShard === null) {
      maxActivity = activity;
      primaryShard = shardObj;
    }
  }

  return primaryShard;
}

/** Select primary shard from record format (modern sharded aggregation) */
export function selectPrimaryShardFromRecord(
  shards: Record<string, unknown>,
): Record<string, unknown> | null {
  let primaryShard: Record<string, unknown> | null = null;
  let maxActivity = 0;

  for (const [, shardData] of Object.entries(shards)) {
    if (!shardData || typeof shardData !== "object") continue;

    const shardObj = shardData as Record<string, unknown>;
    const activity = calculateShardActivity(shardObj);

    if (activity > maxActivity || primaryShard === null) {
      maxActivity = activity;
      primaryShard = shardObj;
    }
  }

  return primaryShard;
}

/**
 * Calculate shard execution activity for primary shard selection.
 * Higher score indicates more active shard.
 */
function calculateShardActivity(shard: Record<string, unknown>): number {
  let activity = 0;

  if (shard.executionStats && typeof shard.executionStats === "object") {
    const stats = shard.executionStats as Record<string, unknown>;
    activity += getNumericValue(stats, "nReturned") * 10;
    activity += getNumericValue(stats, "executionTimeMillis") * 1;
    activity += getNumericValue(stats, "totalDocsExamined") * 2;
    activity += getNumericValue(stats, "totalKeysExamined") * 1;
  }

  if (shard.executionStages && typeof shard.executionStages === "object") {
    const stages = shard.executionStages as Record<string, unknown>;
    activity += getNumericValue(stages, "nReturned") * 10;
    activity += getNumericValue(stages, "executionTimeMillis") * 1;
    activity += getNumericValue(stages, "docsExamined") * 2;
  }

  return activity > 0 ? activity : 1;
}

function getNumericValue(obj: Record<string, unknown>, key: string): number {
  const value = obj[key];
  return typeof value === "number" ? value : 0;
}
