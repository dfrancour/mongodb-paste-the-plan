import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const CACHED_PLAN: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("CACHED_PLAN"),
  querySolutionStageType: QuerySolutionStageType.STAGE_CACHED_PLAN,

  fullName: "Cached Query Plan",
  description:
    "Executes a cached query plan from the plan cache. Monitors performance to " +
    "detect if the cached plan should be replaced.",
  category: StageCategory.QueryPlanning,
  iconName: "Cog",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking wrapper stage. Uses cached plan to avoid re-planning queries. " +
    "Monitors plan performance during a trial period. " +
    "Triggers replanning if the cached plan performs poorly compared to expectations. " +
    "Reduces overhead by skipping query planning for repeated query shapes.",

  sourceFile: "src/mongo/db/exec/classic/cached_plan.h",

  // Orchestration wrapper — delegates to child plan; no stage-specific metrics
  explainFields: [],
} as const;
