import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const hj: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("hj"),
  querySolutionStageType: QuerySolutionStageType.STAGE_HASH_JOIN_EMBEDDING_NODE,

  fullName: "SBE Hash Join (abbreviated)",
  description:
    "Abbreviated debug string representation of hash_join. " +
    "Same as hash_join - builds hash table from outer side, probes with inner side.",
  category: StageCategory.Join,
  iconName: "Link",

  blockingStage: true,
  canSpillToDisk: false,

  performanceNotes:
    "Alias for hash_join in explain output. See hash_join for performance details.",

  sourceFile: "src/mongo/db/exec/sbe/stages/hash_join.h",

  // Abbreviated alias for hash_join — see hash_join for field declarations
  explainFields: [],
} as const;
