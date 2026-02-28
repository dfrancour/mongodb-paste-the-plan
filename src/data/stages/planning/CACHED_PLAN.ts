import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const CACHED_PLAN: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("CACHED_PLAN"),
  querySolutionStageType: QuerySolutionStageType.STAGE_CACHED_PLAN,

  fullName: "Cached Query Plan",
  description:
    "The query planner retrieves a previously cached plan for this query shape. " +
    "Monitors performance during a trial period and triggers replanning " +
    "if the cached plan underperforms.",
  category: StageCategory.QueryPlanning,
  iconName: "Cog",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking wrapper stage. Avoids re-planning overhead for repeated " +
    "query shapes. Monitors plan performance during a trial period.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [],
} as const;
