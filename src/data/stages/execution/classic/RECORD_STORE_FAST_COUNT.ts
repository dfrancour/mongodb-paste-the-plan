import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const RECORD_STORE_FAST_COUNT: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("RECORD_STORE_FAST_COUNT"),
  querySolutionStageType: QuerySolutionStageType.STAGE_RECORD_STORE_FAST_COUNT,

  fullName: "Fast Record Count",
  description:
    "Returns document count using collection metadata without scanning. " +
    "Avoids scanning documents or indexes entirely.",
  category: StageCategory.Internal,
  iconName: "Calculator",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking stage with O(1) complexity. " +
    "Reads count directly from collection metadata. " +
    "Only usable when query has no predicates and collection is not capped.",

  sourceFile: "src/mongo/db/exec/classic/record_store_fast_count.h",
} as const;
