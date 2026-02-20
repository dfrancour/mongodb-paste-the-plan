import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds } from "../../types";

export const EXPRESS_IXSCAN: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("EXPRESS_IXSCAN"),

  fullName: "Express Index Scan",
  description:
    "MongoDB 8.0+ optimized index scan that bypasses regular query planning. " +
    "Streamlined execution path for simple _id or single-field equality queries.",
  category: StageCategory.IndexScan,
  iconName: "Search",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Part of Express execution path introduced in MongoDB 8.0. " +
    "Bypasses query planning overhead for simple index lookups. " +
    "For _id queries, produces at most one document. For user indexes, can produce multiple matches. " +
    "Tends to be faster than traditional IXSCAN for simple equality queries.",

  sourceFile: "src/mongo/db/exec/express/express_plan.h",
} as const;
