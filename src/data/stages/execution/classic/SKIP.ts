import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const SKIP: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("SKIP"),
  querySolutionStageType: QuerySolutionStageType.STAGE_SKIP,

  fullName: "Skip Documents",
  description:
    "Skips a specified number of documents from the input stream before " +
    "passing results through to the parent stage.",
  category: StageCategory.Filter,
  iconName: "Filter",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. No buffering - just counts and discards first N documents. " +
    "Efficient but still requires reading the skipped documents from storage.",

  sourceFile: "src/mongo/db/exec/classic/skip.h",
} as const;
