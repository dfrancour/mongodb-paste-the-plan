import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";
import { DOCS_EXAMINED_FIELD } from "../../fields/common";
import { INDEX_METADATA_FIELDS } from "../../fields/index_metadata";

export const DISTINCT_SCAN: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("DISTINCT_SCAN"),
  querySolutionStageType: QuerySolutionStageType.STAGE_DISTINCT_SCAN,

  fullName: "Distinct Index Scan",
  description:
    "Optimized index scan for distinct() queries that skips duplicate values. " +
    "Uses key-skipping behavior to jump over duplicate index keys efficiently.",
  category: StageCategory.IndexScan,
  iconName: "Search",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Much more efficient than full index scan + deduplication. " +
    "Skips over duplicate keys by seeking to next distinct value. " +
    "Requires appropriate index on the distinct field. " +
    "Performance improvement proportional to number of duplicates.",

  sourceFile: "src/mongo/db/exec/classic/distinct_scan.h",

  explainFields: [
    ...INDEX_METADATA_FIELDS,
    {
      bsonKey: "direction",
      description: "Scan direction (forward or backward)",
      valueType: "string",
      verbosity: "queryPlanner",
    },
    {
      bsonKey: "indexBounds",
      description: "Key ranges scanned in each index field",
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
    DOCS_EXAMINED_FIELD,
  ],
} as const;
