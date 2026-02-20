import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds } from "../../types";

export const EXPRESS_UPDATE: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("EXPRESS_UPDATE"),

  fullName: "Express Update",
  description:
    "MongoDB 8.0+ optimized update operation. Streamlined write path for simple " +
    "single-document updates by _id.",
  category: StageCategory.Writes,
  iconName: "Edit",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking write stage. Part of Express execution path. " +
    "Streamlined path for simple _id-based updates. " +
    "Supports both in-place updates and full document replacement. " +
    "Handles shard key immutability checks for sharded clusters. " +
    "Does not support upserts or positional updates (must be simple _id queries). " +
    "Lower latency than standard update path for qualifying operations.",

  sourceFile: "src/mongo/db/exec/express/express_plan.h",
} as const;
