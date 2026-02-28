import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const hash_join_embedding: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("hash_join_embedding"),
  querySolutionStageType: QuerySolutionStageType.STAGE_HASH_JOIN_EMBEDDING_NODE,

  fullName: "SBE Hash Join Embedding",
  description:
    "SBE engine's hash join implementation for vector search embedding lookups. " +
    "Builds a hash table from the inner side and probes it with embedding vectors.",
  category: StageCategory.Join,
  iconName: "Link",

  blockingStage: true,
  canSpillToDisk: false,

  performanceNotes:
    "Blocking on the build side — must materialize the hash table before probing. " +
    "Memory usage depends on the number of embeddings in the inner collection.",

  sourceFile: "src/mongo/db/query/stage_builder/sbe/gen_lookup.cpp",

  // No stage-specific explain serialization — only SBE common fields emitted
  explainFields: [],
} as const;
