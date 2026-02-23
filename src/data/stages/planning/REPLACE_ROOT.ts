import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const REPLACE_ROOT: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("REPLACE_ROOT"),
  querySolutionStageType: QuerySolutionStageType.STAGE_REPLACE_ROOT,

  fullName: "Replace Root",
  description:
    "The query planner pushes a $replaceRoot or $replaceWith operation into the execution engine. " +
    "Replaces each document with a specified embedded document or expression result.",
  category: StageCategory.Transformation,
  iconName: "Layers",

  builtFromUserSyntax: [
    StageIds.pipeline("$replaceRoot"),
    StageIds.pipeline("$replaceWith"),
  ],

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Transforms each document individually.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [],
} as const;
