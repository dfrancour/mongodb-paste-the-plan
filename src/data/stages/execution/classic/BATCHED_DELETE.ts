import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const BATCHED_DELETE: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("BATCHED_DELETE"),
  querySolutionStageType: QuerySolutionStageType.STAGE_BATCHED_DELETE,

  fullName: "Batched Delete",
  description:
    "Performs deletion operations in batches to improve performance and reduce lock contention. " +
    "Introduced in MongoDB 6.1 for efficient multi-document deletes.",
  category: StageCategory.Writes,
  iconName: "Edit",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking write stage with batching optimization. " +
    "Groups multiple delete operations into batches to reduce write lock overhead. " +
    "More efficient than individual deletes for bulk operations. " +
    "Yields periodically to allow other operations to acquire locks. " +
    "Introduced in MongoDB 6.1 specifically to improve multi-document delete performance. " +
    "Particularly beneficial for deleting large numbers of documents.",

  sourceFile: "src/mongo/db/exec/classic/batched_delete_stage.h",
} as const;
