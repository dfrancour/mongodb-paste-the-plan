import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const SORT_KEY_GENERATOR: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("SORT_KEY_GENERATOR"),
  querySolutionStageType: QuerySolutionStageType.STAGE_SORT_KEY_GENERATOR,

  fullName: "Sort Key Generator",
  description:
    "The query planner adds a sort key extraction stage to prepare " +
    "documents for downstream sorting. Computes comparable sort keys " +
    "including dotted paths, arrays, and collation rules.",
  category: StageCategory.Sort,
  iconName: "SortAsc",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Extracts sort keys from documents " +
    "as they flow through. Handles complex sort key extraction " +
    "including collation rules.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [],
} as const;
