import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const RETURN_KEY: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("RETURN_KEY"),
  querySolutionStageType: QuerySolutionStageType.STAGE_RETURN_KEY,

  fullName: "Return Index Keys",
  description:
    "Returns only index keys without fetching full documents. " +
    "Used with returnKey option to inspect index key values.",
  category: StageCategory.Transformation,
  iconName: "Layers",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Very efficient - no document fetch required. " +
    "Returns raw index key for each result. " +
    "Primarily used for debugging and index analysis. " +
    "Minimal overhead compared to full document retrieval.",

  sourceFile: "src/mongo/db/exec/classic/return_key.h",

  // Pure pass-through transform — returns index keys without additional metrics
  explainFields: [],
} as const;
