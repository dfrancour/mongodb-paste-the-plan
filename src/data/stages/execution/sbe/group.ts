import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const group: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("group"),

  querySolutionStageType: QuerySolutionStageType.STAGE_GROUP,

  fullName: "SBE Group",
  description:
    "SBE engine's hash-based aggregation stage. Groups documents by specified keys " +
    "and computes aggregate values using hash tables for efficient in-memory grouping.",
  category: StageCategory.Aggregation,
  iconName: "Group",

  blockingStage: true,
  canSpillToDisk: true,

  performanceNotes:
    "Blocking stage that must consume all input before producing output. " +
    "Uses hash tables for grouping, which tends to be faster than the classic engine equivalent. " +
    "Can spill to disk when memory limit is exceeded (default 100MB, controlled by " +
    "internalQuerySlotBasedExecutionHashAggApproxMemoryUseInBytesBeforeSpill).",

  sourceFile: "src/mongo/db/exec/sbe/stages/hash_agg.h",
} as const;
