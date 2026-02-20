import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const RECORD_STORE_FAST_COUNT: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("RECORD_STORE_FAST_COUNT"),
  querySolutionStageType: QuerySolutionStageType.STAGE_RECORD_STORE_FAST_COUNT,

  fullName: "Fast Record Count",
  description:
    "The query planner selects a fast count using collection metadata " +
    "without scanning documents or indexes. Only possible when the " +
    "query has no predicates.",
  category: StageCategory.Internal,
  iconName: "Calculator",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking stage with O(1) complexity. Reads count directly " +
    "from collection metadata.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
