import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const hash_lookup: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("hash_lookup"),
  querySolutionStageType: QuerySolutionStageType.STAGE_EQ_LOOKUP,

  fullName: "SBE Hash Lookup",
  description:
    "Multi-key hash lookup combining left join and unwind for $lookup operations. " +
    "Builds hash table from inner side, streams outer side through.",
  category: StageCategory.Join,
  iconName: "Link",

  blockingStage: true, // Blocking on inner side
  canSpillToDisk: true,

  performanceNotes:
    "Blocking on inner (right) side - builds hash table from all inner rows before streaming begins. " +
    "Then streams outer (left) side while probing the hash table for matches. " +
    "Each outer row is paired with an array of matched inner rows. " +
    "Can spill hash table to disk when memory limit is exceeded.",

  analysisNote: "Join operation - can be expensive for large collections",

  sourceFile: "src/mongo/db/exec/sbe/stages/hash_lookup.h",
} as const;
