import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const MATCH: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("MATCH"),
  querySolutionStageType: QuerySolutionStageType.STAGE_MATCH,

  fullName: "Match",
  description:
    "The query planner pushes a $match filter into the execution engine. " +
    "Evaluates a predicate on each document and passes through those that match.",
  category: StageCategory.Filter,
  iconName: "Filter",

  builtFromUserSyntax: [StageIds.pipeline("$match")],

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Evaluates predicate for each document. " +
    "Efficient for selective predicates that eliminate most input early.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
