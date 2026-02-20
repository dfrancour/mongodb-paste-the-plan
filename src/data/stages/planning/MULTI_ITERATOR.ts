import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const MULTI_ITERATOR: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("MULTI_ITERATOR"),
  querySolutionStageType: QuerySolutionStageType.STAGE_MULTI_ITERATOR,

  fullName: "Multiple Iterators",
  description:
    "The query planner coordinates multiple record store cursors for " +
    "queries that need to scan the same collection with different strategies.",
  category: StageCategory.Internal,
  iconName: "Cog",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Coordinates multiple cursors over " +
    "the same collection. Memory overhead proportional to number of " +
    "active cursors.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
