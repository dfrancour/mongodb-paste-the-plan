import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds } from "../../types";

export const EXPRESS_CLUSTERED_IXSCAN: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("EXPRESS_CLUSTERED_IXSCAN"),

  fullName: "Express Clustered Index Scan",
  description:
    "MongoDB 8.0+ optimized scan for clustered collections. Direct document lookup " +
    "by _id on collections where data is physically stored in _id order.",
  category: StageCategory.IndexScan,
  iconName: "Search",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Part of Express execution path. " +
    "For clustered collections, directly looks up documents by _id. " +
    "Produces at most one document per query. " +
    "Tends to be faster than traditional CLUSTERED_IXSCAN for simple _id lookups.",

  sourceFile: "src/mongo/db/exec/express/express_plan.h",
} as const;
