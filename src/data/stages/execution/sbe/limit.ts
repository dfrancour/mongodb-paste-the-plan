import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const limit: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("limit"),
  querySolutionStageType: QuerySolutionStageType.STAGE_LIMIT,

  fullName: "SBE Limit",
  description:
    "Limits the number of results returned from the input stream. " +
    "Alias or variant of limit_skip stage.",
  category: StageCategory.Filter,
  iconName: "Filter",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Returns up to N documents then stops. " +
    "Very efficient - no buffering required. Can stop pipeline execution early.",

  sourceFile: "src/mongo/db/exec/sbe/stages/limit_skip.h",
} as const;
