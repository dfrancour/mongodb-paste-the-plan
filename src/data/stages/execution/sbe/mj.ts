import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const mj: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("mj"),
  querySolutionStageType: QuerySolutionStageType.STAGE_SORT_MERGE,

  fullName: "SBE Merge Join (abbreviated)",
  description:
    "Abbreviated debug string representation of merge_join. " +
    "Same as merge_join - joins sorted inputs efficiently.",
  category: StageCategory.Join,
  iconName: "Link",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Alias for merge_join in explain output. See merge_join for performance details.",

  sourceFile: "src/mongo/db/exec/sbe/stages/merge_join.h",
} as const;
