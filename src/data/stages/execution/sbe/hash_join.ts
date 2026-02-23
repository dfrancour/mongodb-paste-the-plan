import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const hash_join: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("hash_join"),
  querySolutionStageType: QuerySolutionStageType.STAGE_HASH_JOIN_EMBEDDING_NODE,

  fullName: "SBE Hash Join",
  description:
    "Traditional hash join implementation. Builds hash table from outer/build side, " +
    "then probes with inner side. Equality join on specified condition slots.",
  category: StageCategory.Join,
  iconName: "Link",

  blockingStage: true, // Blocking on outer/build side
  canSpillToDisk: false,

  performanceNotes:
    "Blocking on outer (build) side - must fully consume outer input to build hash table. " +
    "Then streams inner (probe) side through the join. " +
    "Memory usage proportional to outer side size. Efficient for equality joins.",

  sourceFile: "src/mongo/db/exec/sbe/stages/hash_join.h",

  // No stage-specific explain serialization — only SBE common fields emitted
  explainFields: [],
} as const;
