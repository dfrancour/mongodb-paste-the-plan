import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const nested_loop_join_embedding: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("nested_loop_join_embedding"),
  querySolutionStageType:
    QuerySolutionStageType.STAGE_NESTED_LOOP_JOIN_EMBEDDING_NODE,

  fullName: "SBE Nested Loop Join Embedding",
  description:
    "SBE engine's nested loop join implementation for vector search embedding lookups. " +
    "For each outer document, iterates the inner side to find matching embeddings.",
  category: StageCategory.Join,
  iconName: "Link",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking but cost grows with the product of outer and inner side sizes. " +
    "Used when a hash join is not suitable for the embedding lookup.",

  sourceFile: "src/mongo/db/query/stage_builder/sbe/gen_lookup.cpp",

  // No stage-specific explain serialization — only SBE common fields emitted
  explainFields: [],
} as const;
