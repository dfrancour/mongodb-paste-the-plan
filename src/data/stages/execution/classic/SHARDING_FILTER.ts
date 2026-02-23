import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const SHARDING_FILTER: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("SHARDING_FILTER"),
  querySolutionStageType: QuerySolutionStageType.STAGE_SHARDING_FILTER,

  fullName: "Sharding Filter",
  description:
    "Filters out documents not owned by the current shard based on shard key. " +
    "Critical for sharded clusters to ensure query correctness during migrations.",
  category: StageCategory.Filter,
  iconName: "Filter",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Evaluates shard ownership for each document. " +
    "Very lightweight check using shard key metadata. " +
    "Essential during chunk migrations to filter orphaned documents. " +
    "Minimal overhead in stable clusters, critical for correctness during migrations.",

  sourceFile: "src/mongo/db/exec/classic/shard_filter.h",

  explainFields: [
    {
      bsonKey: "chunkSkips",
      description: "Documents filtered out as not owned by this shard",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
  ],
} as const;
