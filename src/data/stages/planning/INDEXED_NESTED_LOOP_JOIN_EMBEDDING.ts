import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const INDEXED_NESTED_LOOP_JOIN_EMBEDDING: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("INDEXED_NESTED_LOOP_JOIN_EMBEDDING"),
  querySolutionStageType:
    QuerySolutionStageType.STAGE_INDEXED_NESTED_LOOP_JOIN_EMBEDDING_NODE,

  fullName: "Indexed Nested Loop Join Embedding",
  description:
    "Performs an indexed nested loop join for vector search embedding lookups. " +
    "Uses an index on the inner side to efficiently find matching embeddings " +
    "for each outer document.",
  category: StageCategory.Join,
  iconName: "Link",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "More efficient than a plain nested loop join because it uses an index " +
    "to probe the inner side. Used in vector search query plans when a suitable " +
    "index is available on the embedding field.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [
    {
      bsonKey: "leftEmbeddingField",
      description: "Embedding field from the left (outer) side of the join",
      valueType: "string",
      verbosity: "queryPlanner",
    },
    {
      bsonKey: "rightEmbeddingField",
      description: "Embedding field from the right (inner) side of the join",
      valueType: "string",
      verbosity: "queryPlanner",
    },
    {
      bsonKey: "joinPredicates",
      description: "Predicates used for the embedding join",
      valueType: "object",
      verbosity: "queryPlanner",
    },
  ],
} as const;
