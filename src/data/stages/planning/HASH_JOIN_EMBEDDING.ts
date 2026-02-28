import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const HASH_JOIN_EMBEDDING: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("HASH_JOIN_EMBEDDING"),
  querySolutionStageType: QuerySolutionStageType.STAGE_HASH_JOIN_EMBEDDING_NODE,

  fullName: "Hash Join Embedding",
  description:
    "Performs a hash join for vector search embedding lookups. " +
    "Builds a hash table from one side of the join and probes it with " +
    "embedding vectors from the other side.",
  category: StageCategory.Join,
  iconName: "Link",

  blockingStage: true,
  canSpillToDisk: false,

  performanceNotes:
    "Blocking on the build side — must materialize the hash table before probing. " +
    "Used in vector search query plans for joining embedding results.",

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
