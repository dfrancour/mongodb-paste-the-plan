import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const PROJECTION_COVERED: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("PROJECTION_COVERED"),
  querySolutionStageType: QuerySolutionStageType.STAGE_PROJECTION_COVERED,

  fullName: "Covered Projection",
  description:
    "The query planner selects a covered projection that returns fields " +
    "directly from index data. No document fetch is required — the query " +
    "is entirely covered by the index.",
  category: StageCategory.Transformation,
  iconName: "Layers",

  builtFromUserSyntax: [StageIds.pipeline("$project")],

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Avoids document fetch entirely. " +
    "All projected fields come from index data. Requires an index " +
    "containing all projected fields and query predicates.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
