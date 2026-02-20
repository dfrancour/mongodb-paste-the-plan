import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const NESTED_LOOP_JOIN_EMBEDDING: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("NESTED_LOOP_JOIN_EMBEDDING"),
  querySolutionStageType:
    QuerySolutionStageType.STAGE_NESTED_LOOP_JOIN_EMBEDDING_NODE,

  fullName: "Nested Loop Join Embedding",
  description:
    "Performs a nested loop join for vector search embedding lookups. " +
    "For each outer document, scans the inner side to find matching embeddings.",
  category: StageCategory.Join,
  iconName: "Link",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking but potentially expensive — iterates the inner side for each outer document. " +
    "Used in vector search query plans when a hash join is not suitable.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
