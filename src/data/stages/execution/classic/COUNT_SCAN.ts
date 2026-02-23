import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";
import { INDEX_METADATA_FIELDS } from "../../fields/index_metadata";

export const COUNT_SCAN: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("COUNT_SCAN"),
  querySolutionStageType: QuerySolutionStageType.STAGE_COUNT_SCAN,

  fullName: "Count Index Scan",
  description:
    "Optimized index scan for count() queries. Skips key examination when possible, " +
    "just counting index entries instead of fully processing them.",
  category: StageCategory.Aggregation,
  iconName: "Calculator",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Optimized for counting index entries. " +
    "Can skip key deserialization when only the count is needed. " +
    "Works with index bounds to count documents within a range. " +
    "Generally faster than scanning documents when an appropriate index exists.",

  sourceFile: "src/mongo/db/exec/classic/count_scan.h",

  explainFields: [
    ...INDEX_METADATA_FIELDS,
    {
      bsonKey: "indexBounds",
      description: "Start/end key bounds for the count scan",
      valueType: "object",
      verbosity: "queryPlanner",
    },
    {
      bsonKey: "keysExamined",
      description: "Number of index keys examined",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
  ],
} as const;
