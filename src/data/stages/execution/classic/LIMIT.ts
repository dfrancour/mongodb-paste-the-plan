import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const LIMIT: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("LIMIT"),
  querySolutionStageType: QuerySolutionStageType.STAGE_LIMIT,

  fullName: "Limit Results",
  description:
    "Limits the number of documents returned from the input stream. " +
    "Stops execution after returning the specified number of documents.",
  category: StageCategory.Filter,
  iconName: "Filter",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Very efficient - no buffering required. " +
    "Can stop pipeline execution early once limit is reached.",

  sourceFile: "src/mongo/db/exec/classic/limit.h",
} as const;
