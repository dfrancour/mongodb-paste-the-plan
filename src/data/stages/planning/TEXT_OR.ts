import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const TEXT_OR: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("TEXT_OR"),
  querySolutionStageType: QuerySolutionStageType.STAGE_TEXT_OR,

  fullName: "Text OR",
  description:
    "The query planner combines results from multiple text search terms " +
    "using OR logic. Merges, deduplicates, and aggregates text scores " +
    "across terms.",
  category: StageCategory.Filter,
  iconName: "Filter",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Merges results from multiple text " +
    "search terms. Deduplicates documents matching multiple terms.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
