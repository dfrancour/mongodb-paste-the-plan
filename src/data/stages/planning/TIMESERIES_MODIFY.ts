import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const TIMESERIES_MODIFY: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("TIMESERIES_MODIFY"),
  querySolutionStageType: QuerySolutionStageType.STAGE_TIMESERIES_MODIFY,

  fullName: "Time-Series Modification",
  description:
    "The query planner selects a time-series modification strategy for " +
    "update or delete operations on time-series collections. Modifies " +
    "measurements within bucket documents.",
  category: StageCategory.Writes,
  iconName: "Edit",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking write stage for time-series collections. Unpacks buckets, " +
    "applies modifications to matching measurements, then repacks. " +
    "More complex than regular document updates due to bucket-based storage.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
