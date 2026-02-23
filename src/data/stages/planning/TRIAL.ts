import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const TRIAL: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("TRIAL"),
  querySolutionStageType: QuerySolutionStageType.STAGE_TRIAL,

  fullName: "Plan Selection Trial",
  description:
    "The query planner runs a trial period to evaluate candidate plan " +
    "performance. Collects metrics to help select the optimal plan " +
    "before full execution.",
  category: StageCategory.QueryPlanning,
  iconName: "Cog",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking wrapper stage. Runs during multi-planning trial period. " +
    "Limited execution — stops after trial work units consumed.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [],
} as const;
