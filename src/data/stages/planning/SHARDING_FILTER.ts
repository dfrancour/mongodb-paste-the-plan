import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const SHARDING_FILTER: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("SHARDING_FILTER"),
  querySolutionStageType: QuerySolutionStageType.STAGE_SHARDING_FILTER,

  fullName: "Sharding Filter",
  description:
    "The query planner adds a shard ownership filter to ensure query " +
    "correctness in sharded clusters. Filters out documents not owned " +
    "by the current shard based on shard key.",
  category: StageCategory.Filter,
  iconName: "Filter",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Very lightweight shard ownership " +
    "check. Essential during chunk migrations to filter orphaned documents.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
