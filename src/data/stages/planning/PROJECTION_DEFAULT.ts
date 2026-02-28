import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const PROJECTION_DEFAULT: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("PROJECTION_DEFAULT"),
  querySolutionStageType: QuerySolutionStageType.STAGE_PROJECTION_DEFAULT,

  fullName: "Default Projection",
  description:
    "The query planner adds a default projection to compute projected " +
    "fields from full documents. Handles complex projections including " +
    "computed fields and expressions.",
  category: StageCategory.Transformation,
  iconName: "Layers",

  builtFromUserSyntax: [StageIds.pipeline("$project")],

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Most general projection implementation. " +
    "Requires full document fetch — cannot use index-only data.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [
    {
      bsonKey: "transformBy",
      description: "Projection specification applied to documents",
      valueType: "object",
      verbosity: "queryPlanner",
    },
  ],
} as const;
