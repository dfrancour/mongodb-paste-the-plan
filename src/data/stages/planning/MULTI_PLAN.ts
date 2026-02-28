import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const MULTI_PLAN: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("MULTI_PLAN"),
  querySolutionStageType: QuerySolutionStageType.STAGE_MULTI_PLAN,

  fullName: "Multiple Plan Evaluation",
  description:
    "The query planner evaluates multiple candidate plans in parallel " +
    "during a trial period. Selects the best performing plan based on " +
    "trial run metrics and caches it for future queries.",
  category: StageCategory.QueryPlanning,
  iconName: "Cog",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking wrapper stage. Runs candidate plans concurrently " +
    "during trial. Adds overhead to first execution but improves " +
    "subsequent query performance through plan caching.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [],
} as const;
