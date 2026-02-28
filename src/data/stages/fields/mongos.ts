/**
 * Shared mongos coordination stage fields.
 *
 * Source: src/mongo/s/commands/query_cmd/cluster_explain.cpp
 *   buildExecStats() lines 316-378
 *
 * These fields appear in executionStages for sharded queries.
 * They aggregate stats across all targeted shards.
 */
import type { ExplainFieldDeclaration } from "../types";

/**
 * Fields common to all mongos coordination stages (SINGLE_SHARD,
 * SHARD_MERGE, SHARD_MERGE_SORT, SHARD_WRITE).
 *
 * These are the top-level aggregated stats from cluster_explain.cpp.
 */
export const MONGOS_COMMON_FIELDS: readonly ExplainFieldDeclaration[] = [
  {
    bsonKey: "totalChildMillis",
    description: "Sum of execution times across all targeted shards",
    valueType: "number",
    verbosity: "executionStats",
    unit: "ms",
  },
] as const;

/**
 * Fields emitted only by multi-shard merge stages when limit/skip
 * is applied at the mongos level.
 *
 * Source: cluster_explain.cpp lines 371-377
 * Only emitted when multipleShards is true.
 */
export const MONGOS_LIMIT_SKIP_FIELDS: readonly ExplainFieldDeclaration[] = [
  {
    bsonKey: "limitAmount",
    description: "Limit applied at mongos after merging shard results",
    valueType: "number",
    verbosity: "executionStats",
    unit: "count",
  },
  {
    bsonKey: "skipAmount",
    description: "Skip applied at mongos after merging shard results",
    valueType: "number",
    verbosity: "executionStats",
    unit: "count",
  },
  {
    bsonKey: "nCounted",
    description: "Total count across shards (count operations only)",
    valueType: "number",
    verbosity: "executionStats",
    unit: "count",
  },
] as const;
