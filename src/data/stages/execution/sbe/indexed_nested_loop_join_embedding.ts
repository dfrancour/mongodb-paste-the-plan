import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const indexed_nested_loop_join_embedding: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("indexed_nested_loop_join_embedding"),
  querySolutionStageType:
    QuerySolutionStageType.STAGE_INDEXED_NESTED_LOOP_JOIN_EMBEDDING_NODE,

  fullName: "SBE Indexed Nested Loop Join Embedding",
  description:
    "SBE engine's indexed nested loop join for vector search embedding lookups. " +
    "Uses an index on the inner side to efficiently locate matching embeddings " +
    "for each outer document.",
  category: StageCategory.Join,
  iconName: "Link",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "More efficient than a plain nested loop join because index probes replace full scans " +
    "of the inner side. Preferred when a suitable index exists on the embedding field.",

  sourceFile: "src/mongo/db/query/stage_builder/sbe/gen_lookup.cpp",
} as const;
