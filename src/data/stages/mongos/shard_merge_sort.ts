import type { MongosStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const SHARD_MERGE_SORT: MongosStage = {
  layer: "mongos",
  id: StageIds.mongos("SHARD_MERGE_SORT"),

  fullName: "Shard Merge Sort",
  description:
    "Merges sorted results from multiple shards while preserving sort order. Appears in sharded " +
    "cluster explains when a query with a sort is executed on multiple shards.",
  category: StageCategory.Sort,
  iconName: "Merge",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Performs a streaming merge sort of pre-sorted results from each shard. Each shard sorts " +
    "its own results, and mongos merges them maintaining the global sort order. More expensive " +
    "than SHARD_MERGE due to the coordination required to maintain ordering.",

  sourceFile: "src/mongo/s/commands/query_cmd/cluster_explain.cpp",
} as const;
