import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const LIMIT: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("LIMIT"),
  querySolutionStageType: QuerySolutionStageType.STAGE_LIMIT,

  fullName: "Limit",
  description:
    "The query planner adds a limit node to cap the number of documents " +
    "returned. Stops execution early once the specified number of " +
    "documents is reached.",
  category: StageCategory.Filter,
  iconName: "Filter",

  builtFromUserSyntax: [StageIds.pipeline("$limit")],

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Very efficient — no buffering required. " +
    "Can stop pipeline execution early once limit is reached.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [
    {
      bsonKey: "limitAmount",
      description: "Maximum number of documents to return",
      valueType: "number",
      verbosity: "queryPlanner",
      cppName: "limit",
      unit: "count",
    },
  ],
} as const;
