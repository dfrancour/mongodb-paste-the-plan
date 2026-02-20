import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const MULTI_PLAN: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("MULTI_PLAN"),
  querySolutionStageType: QuerySolutionStageType.STAGE_MULTI_PLAN,

  fullName: "Multiple Plan Execution",
  description:
    "Executes multiple candidate query plans in parallel during a trial period. " +
    "Selects the best performing plan based on trial run metrics.",
  category: StageCategory.QueryPlanning,
  iconName: "Cog",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking wrapper stage. Runs candidate plans concurrently during trial. " +
    "Trial period limited by work units or document count. " +
    "Winning plan is cached for future queries. " +
    "Ensures optimal plan selection when multiple viable plans exist. " +
    "Adds overhead to first execution but improves subsequent query performance.",

  sourceFile: "src/mongo/db/exec/classic/multi_plan.h",
} as const;
