import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const BATCHED_DELETE: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("BATCHED_DELETE"),
  querySolutionStageType: QuerySolutionStageType.STAGE_BATCHED_DELETE,

  fullName: "Batched Delete",
  description:
    "The query planner selects a batched delete strategy for efficient " +
    "multi-document removal. Groups delete operations into batches to " +
    "reduce lock contention.",
  category: StageCategory.Writes,
  iconName: "Edit",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking write stage with batching optimization. More efficient " +
    "than individual deletes for bulk operations. Yields periodically " +
    "to allow other operations.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [],
} as const;
