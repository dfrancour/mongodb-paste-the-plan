import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const TEXT_MATCH: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("TEXT_MATCH"),
  querySolutionStageType: QuerySolutionStageType.STAGE_TEXT_MATCH,

  fullName: "Text Match",
  description:
    "The query planner adds a text match filter to evaluate text search " +
    "criteria and compute relevance scores for matching documents.",
  category: StageCategory.Filter,
  iconName: "Filter",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Evaluates text search predicates " +
    "and computes relevance scores. Performance depends on text " +
    "complexity and number of terms.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
