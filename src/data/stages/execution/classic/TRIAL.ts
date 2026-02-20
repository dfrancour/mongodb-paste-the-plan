import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const TRIAL: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("TRIAL"),
  querySolutionStageType: QuerySolutionStageType.STAGE_TRIAL,

  fullName: "Plan Selection Trial",
  description:
    "Executes candidate query plans during a trial period to measure performance. " +
    "Collects metrics to help select the optimal plan.",
  category: StageCategory.QueryPlanning,
  iconName: "Cog",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking wrapper stage. Runs during multi-planning trial period. " +
    "Collects performance metrics for plan selection. " +
    "Limited execution - stops after trial work units consumed. " +
    "Helps identify best plan before full query execution.",

  sourceFile: "src/mongo/db/exec/classic/trial_stage.h",
} as const;
