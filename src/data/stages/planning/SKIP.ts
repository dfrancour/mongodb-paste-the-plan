import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const SKIP: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("SKIP"),
  querySolutionStageType: QuerySolutionStageType.STAGE_SKIP,

  fullName: "Skip",
  description:
    "The query planner adds a skip node to discard the first N documents " +
    "from the input stream before passing results through.",
  category: StageCategory.Filter,
  iconName: "Filter",

  builtFromUserSyntax: [StageIds.pipeline("$skip")],

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. No buffering — just counts and " +
    "discards first N documents. Still requires reading the skipped " +
    "documents from storage.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [
    {
      bsonKey: "skipAmount",
      description: "Number of documents to skip",
      valueType: "number",
      verbosity: "queryPlanner",
      cppName: "skip",
      unit: "count",
    },
  ],
} as const;
