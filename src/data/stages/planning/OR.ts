import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const OR: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("OR"),
  querySolutionStageType: QuerySolutionStageType.STAGE_OR,

  fullName: "OR Combiner",
  description:
    "The query planner combines results from multiple child stages " +
    "representing OR conditions. Deduplicates results based on RecordId.",
  category: StageCategory.Filter,
  iconName: "Filter",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Buffers RecordIds to deduplicate " +
    "results. Memory usage proportional to result set size.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
