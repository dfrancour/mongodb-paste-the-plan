import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const PROJECTION_SIMPLE: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("PROJECTION_SIMPLE"),
  querySolutionStageType: QuerySolutionStageType.STAGE_PROJECTION_SIMPLE,

  fullName: "Simple Projection",
  description:
    "The query planner selects an optimized projection for simple field " +
    "inclusion/exclusion without expressions. Faster than default projection " +
    "when only including or excluding fields.",
  category: StageCategory.Transformation,
  iconName: "Layers",

  builtFromUserSyntax: [StageIds.pipeline("$project")],

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. More efficient than PROJECTION_DEFAULT. " +
    "Faster field traversal and copying. Still requires full document fetch.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
