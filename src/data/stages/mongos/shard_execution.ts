import type { MongosStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const SHARD_EXECUTION: MongosStage = {
  layer: "mongos",
  id: StageIds.mongos("SHARD_EXECUTION"),

  fullName: "Shard Execution",
  description:
    "Represents the execution context of a specific shard in a sharded cluster query. " +
    "Contains the shard's total execution time (including optimization overhead) and execution success status. " +
    "This is a synthetic node inserted to preserve per-shard identity and timing that would otherwise be lost.",
  category: StageCategory.Internal,
  iconName: "Server",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "The shard execution time includes query optimization overhead on the shard, which may be " +
    "significantly higher than the child stage execution time. A large gap between shard execution " +
    "time and child execution time indicates optimization cost.",

  sourceFile: "src/mongo/s/commands/query_cmd/cluster_explain.cpp",
} as const;
