import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const WINDOW: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("WINDOW"),
  querySolutionStageType: QuerySolutionStageType.STAGE_WINDOW,

  fullName: "Window",
  description:
    "The query planner pushes a $setWindowFields operation into the execution engine. " +
    "Computes window functions over partitioned, ordered sets of documents.",
  category: StageCategory.Window,
  iconName: "Rows3",

  builtFromUserSyntax: [StageIds.pipeline("$setWindowFields")],

  blockingStage: false,
  canSpillToDisk: true,

  performanceNotes:
    "Semi-blocking — buffers documents within each partition. Output streams as each " +
    "partition completes. Can spill to disk when the window buffer exceeds memory limits. " +
    "Window frame bounds affect how many documents must be buffered at once.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [],
} as const;
