import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const hash_lookup_unwind: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("hash_lookup_unwind"),
  querySolutionStageType: QuerySolutionStageType.STAGE_EQ_LOOKUP_UNWIND,

  fullName: "SBE Hash Lookup with Unwind",
  description:
    "Hash lookup combined with unwind optimization for $lookup operations. " +
    "Like hash_lookup but unwinds results instead of creating arrays.",
  category: StageCategory.Join,
  iconName: "Link",

  blockingStage: true,
  canSpillToDisk: false,

  performanceNotes:
    "Blocking on inner side - builds hash table from all inner rows. " +
    "Combines hash lookup and unwind into a single stage, avoiding the overhead of " +
    "creating intermediate arrays then immediately unwinding them.",

  analysisNote: "Join operation - can be expensive for large collections",

  sourceFile: "src/mongo/db/exec/sbe/stages/hash_lookup_unwind.h",

  // No stage-specific explain serialization — only SBE common fields emitted
  explainFields: [],
} as const;
