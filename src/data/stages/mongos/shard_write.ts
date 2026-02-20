import type { MongosStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const SHARD_WRITE: MongosStage = {
  layer: "mongos",
  id: StageIds.mongos("SHARD_WRITE"),

  fullName: "Shard Write",
  description:
    "Distributes write operations across shards. Appears in sharded cluster explains for " +
    "insert, update, and delete operations that affect documents on multiple shards.",
  category: StageCategory.Writes,
  iconName: "PenLine",

  blockingStage: true,
  canSpillToDisk: false,

  performanceNotes:
    "Write operations are distributed to the appropriate shards based on the shard key. " +
    "Updates and deletes without the shard key in the filter require a scatter-gather to all shards.",

  sourceFile: "src/mongo/s/commands/query_cmd/cluster_explain.cpp",
} as const;
