import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const UNWIND: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("UNWIND"),
  querySolutionStageType: QuerySolutionStageType.STAGE_UNWIND,

  fullName: "Unwind",
  description:
    "The query planner pushes an $unwind operation into the execution engine. " +
    "Deconstructs an array field, producing one output document per array element.",
  category: StageCategory.Transformation,
  iconName: "Layers",

  builtFromUserSyntax: [StageIds.pipeline("$unwind")],

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Produces one row per array element. " +
    "Output cardinality depends on array sizes — can significantly multiply " +
    "document count for large arrays.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [],
} as const;
