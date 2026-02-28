import type { MongosStage } from "../types";
import { StageCategory, StageIds } from "../types";
import {
  MONGOS_COMMON_FIELDS,
  MONGOS_LIMIT_SKIP_FIELDS,
} from "../fields/mongos";

export const SHARD_MERGE: MongosStage = {
  layer: "mongos",
  id: StageIds.mongos("SHARD_MERGE"),

  fullName: "Shard Merge",
  description:
    "Merges unsorted results from multiple shards. Appears in sharded cluster explains when " +
    "a query must be executed on multiple shards and the results don't require sorted merging.",
  category: StageCategory.Internal,
  iconName: "Merge",

  hasParallelChildren: true,
  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Scatter-gather operation across shards. Results are returned as they arrive from each shard " +
    "without ordering guarantees. More efficient than SHARD_MERGE_SORT when ordering is not required.",

  sourceFile: "src/mongo/s/commands/query_cmd/cluster_explain.cpp",

  explainFields: [...MONGOS_COMMON_FIELDS, ...MONGOS_LIMIT_SKIP_FIELDS],
} as const;
