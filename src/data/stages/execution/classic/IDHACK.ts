import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const IDHACK: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("IDHACK"),
  querySolutionStageType: QuerySolutionStageType.STAGE_IDHACK,

  fullName: "ID Hack",
  description:
    "Optimized fast path for single-document lookup by _id. " +
    "Bypasses normal query planning for _id equality queries.",
  category: StageCategory.IndexScan,
  iconName: "Search",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Optimized for _id lookups. " +
    "Returns at most one document. Direct index lookup without bounds checking. " +
    "Only used when query collation matches collection default collation.",

  sourceFile: "src/mongo/db/exec/classic/idhack.h",
} as const;
