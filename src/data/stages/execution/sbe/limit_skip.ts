import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds } from "../../types";

export const limitskip: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("limitskip"),
  // Note: This stage implements both STAGE_LIMIT and STAGE_SKIP, so no single querySolutionStageType

  fullName: "SBE Limit/Skip",
  description:
    "Limits the number of results or skips results from child stage. " +
    "Skip and limit values are evaluated when the plan is opened.",
  category: StageCategory.Filter,
  iconName: "Filter",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Very efficient - just counts documents and stops/skips as needed. " +
    "If both skip and limit are present, skips first then applies limit.",

  sourceFile: "src/mongo/db/exec/sbe/stages/limit_skip.h",
} as const;
