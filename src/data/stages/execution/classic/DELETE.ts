import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const DELETE: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("DELETE"),
  querySolutionStageType: QuerySolutionStageType.STAGE_DELETE,

  fullName: "Delete Documents",
  description:
    "Deletes documents matching the query criteria. Removes documents from " +
    "the collection and updates all affected indexes.",
  category: StageCategory.Writes,
  iconName: "Edit",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Deletes documents one at a time as they're received. " +
    "Acquires write locks per document. Updates all indexes and writes to oplog. " +
    "Performance depends on index count and document size. " +
    "May yield during execution to allow other operations.",

  sourceFile: "src/mongo/db/exec/classic/delete_stage.h",

  explainFields: [
    {
      bsonKey: "nWouldDelete",
      description: "Number of documents that would be deleted",
      valueType: "number",
      verbosity: "executionStats",
      cppName: "docsDeleted",
      unit: "count",
    },
  ],
} as const;
