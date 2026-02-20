import type { MongosStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const SINGLE_SHARD: MongosStage = {
  layer: "mongos",
  id: StageIds.mongos("SINGLE_SHARD"),

  fullName: "Single Shard",
  description:
    "Indicates the query was routed to a single shard. Appears in sharded cluster explains " +
    "when the query's filter includes the shard key prefix, allowing mongos to target a specific shard.",
  category: StageCategory.Internal,
  iconName: "Server",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Most efficient sharded query pattern. The query only needs to contact one shard, " +
    "avoiding the overhead of scatter-gather operations across multiple shards.",

  sourceFile: "src/mongo/s/commands/query_cmd/cluster_explain.cpp",
} as const;
