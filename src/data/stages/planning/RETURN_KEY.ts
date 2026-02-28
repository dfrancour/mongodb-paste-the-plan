import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const RETURN_KEY: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("RETURN_KEY"),
  querySolutionStageType: QuerySolutionStageType.STAGE_RETURN_KEY,

  fullName: "Return Index Keys",
  description:
    "The query planner adds a return key node to return only index keys " +
    "without fetching full documents. Used with the returnKey option " +
    "to inspect index key values.",
  category: StageCategory.Transformation,
  iconName: "Layers",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Very efficient — no document fetch " +
    "required. Returns raw index key for each result.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [],
} as const;
