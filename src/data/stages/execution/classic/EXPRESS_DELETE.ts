import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds } from "../../types";

export const EXPRESS_DELETE: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("EXPRESS_DELETE"),

  fullName: "Express Delete",
  description:
    "MongoDB 8.0+ optimized delete operation. Streamlined write path for simple " +
    "single-document deletes by _id.",
  category: StageCategory.Writes,
  iconName: "Edit",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking write stage. Part of Express execution path. " +
    "Streamlined path for simple _id-based deletes. " +
    "Can optionally return the deleted document for findAndModify operations. " +
    "Lower latency than standard delete path for qualifying operations.",

  sourceFile: "src/mongo/db/exec/express/express_plan.h",

  // Express write stages emit basic scan + write stats
  explainFields: [
    {
      bsonKey: "keysExamined",
      description: "Number of index keys examined",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
    {
      bsonKey: "docsExamined",
      description: "Number of documents examined",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
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
