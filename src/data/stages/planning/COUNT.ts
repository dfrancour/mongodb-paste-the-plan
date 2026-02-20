import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const COUNT: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("COUNT"),
  querySolutionStageType: QuerySolutionStageType.STAGE_COUNT,

  fullName: "Count",
  description:
    "The query planner adds a count node to tally documents from its child " +
    "stage, applying optional skip and limit. Sits at the root of count " +
    "operation plans.",
  category: StageCategory.Aggregation,
  iconName: "Calculator",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Does not buffer documents — just " +
    "maintains a counter. Very lightweight.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
