import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const UPDATE: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("UPDATE"),
  querySolutionStageType: QuerySolutionStageType.STAGE_UPDATE,

  fullName: "Update",
  description:
    "The query planner adds an update node to apply modifications to " +
    "documents matching the query criteria. Handles update operators " +
    "and full document replacements.",
  category: StageCategory.Writes,
  iconName: "Edit",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Updates documents one at a time. " +
    "Performance depends on update complexity, index count, and " +
    "document size.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [],
} as const;
