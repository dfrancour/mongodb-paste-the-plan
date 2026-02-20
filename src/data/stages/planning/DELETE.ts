import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const DELETE: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("DELETE"),
  querySolutionStageType: QuerySolutionStageType.STAGE_DELETE,

  fullName: "Delete",
  description:
    "The query planner adds a delete node to remove documents matching " +
    "the query criteria. Deletes documents and updates all affected indexes.",
  category: StageCategory.Writes,
  iconName: "Edit",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Deletes documents one at a time. " +
    "Performance depends on index count and document size.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
