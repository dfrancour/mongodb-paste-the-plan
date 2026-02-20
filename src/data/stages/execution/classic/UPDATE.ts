import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const UPDATE: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("UPDATE"),
  querySolutionStageType: QuerySolutionStageType.STAGE_UPDATE,

  fullName: "Update Documents",
  description:
    "Updates documents matching the query criteria. Applies update operators " +
    "or replacement documents to matched documents.",
  category: StageCategory.Writes,
  iconName: "Edit",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Updates documents one at a time as they're received. " +
    "Acquires write locks per document. Can trigger index updates and oplog writes. " +
    "Performance depends on update complexity, index count, and document size. " +
    "May yield during execution to allow other operations.",

  sourceFile: "src/mongo/db/exec/classic/update_stage.h",
} as const;
