import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const SPOOL: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("SPOOL"),
  querySolutionStageType: QuerySolutionStageType.STAGE_SPOOL,

  fullName: "Spool Buffer",
  description:
    "Eagerly buffers all input from child stage for later reuse. " +
    "Caches RecordIds in memory or on disk for multiple-pass operations.",
  category: StageCategory.Internal,
  iconName: "Database",

  blockingStage: true,
  canSpillToDisk: true,

  performanceNotes:
    "Blocking stage - must consume all input before producing output. Can spill to disk. " +
    "Reads all input and caches document references (RecordIds) for reuse. " +
    "Only caches references (not full documents) to reduce memory and disk usage. " +
    "Used for operations requiring multiple passes over the same data, such as self-joins " +
    "or certain window functions.",

  sourceFile: "src/mongo/db/exec/classic/spool.h",
} as const;
