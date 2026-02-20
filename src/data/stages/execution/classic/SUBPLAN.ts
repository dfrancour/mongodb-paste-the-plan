import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const SUBPLAN: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("SUBPLAN"),
  querySolutionStageType: QuerySolutionStageType.STAGE_SUBPLAN,

  fullName: "Subplan Execution",
  description:
    "Executes rooted $or queries as separate subplans, one per $or branch. " +
    "Each subplan is planned and cached independently for better performance.",
  category: StageCategory.QueryPlanning,
  iconName: "Cog",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking wrapper stage. Plans each $or branch independently. " +
    "Enables per-branch plan caching for rooted $or queries. " +
    "More efficient than single-plan approach for complex $or queries. " +
    "Can leverage different indexes for different branches.",

  sourceFile: "src/mongo/db/exec/classic/subplan.h",
} as const;
