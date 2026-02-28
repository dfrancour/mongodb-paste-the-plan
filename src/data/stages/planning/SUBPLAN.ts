import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const SUBPLAN: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("SUBPLAN"),
  querySolutionStageType: QuerySolutionStageType.STAGE_SUBPLAN,

  fullName: "Subplan Execution",
  description:
    "The query planner decomposes a rooted $or query into separate " +
    "subplans, one per $or branch. Each subplan is planned and cached " +
    "independently for better performance.",
  category: StageCategory.QueryPlanning,
  iconName: "Cog",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking wrapper stage. Plans each $or branch independently. " +
    "Enables per-branch plan caching and can leverage different indexes " +
    "for different branches.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [],
} as const;
