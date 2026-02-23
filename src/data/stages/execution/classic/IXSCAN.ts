import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";
import { INDEX_METADATA_FIELDS } from "../../fields/index_metadata";

export const IXSCAN: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("IXSCAN"),
  querySolutionStageType: QuerySolutionStageType.STAGE_IXSCAN,

  fullName: "Index Scan",
  description:
    "Scans index keys to find matching documents. " +
    "Traverses index from startKey to endKey, optionally applying filters.",
  category: StageCategory.IndexScan,
  iconName: "Search",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Scans index in order (forward or backward). " +
    "Deduplicates on RecordId for multikey indexes. " +
    "Can apply filter expressions over index fields during scan. " +
    "Efficient when index selectivity is high.",

  sourceFile: "src/mongo/db/exec/classic/index_scan.h",

  explainFields: [
    ...INDEX_METADATA_FIELDS,
    {
      bsonKey: "indexBounds",
      description: "Key ranges scanned in each index field",
      valueType: "object",
      verbosity: "queryPlanner",
    },
    {
      bsonKey: "direction",
      description: "Scan direction (forward or backward)",
      valueType: "string",
      verbosity: "queryPlanner",
    },
    {
      bsonKey: "keysExamined",
      description: "Number of index keys examined",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
    {
      bsonKey: "seeks",
      description: "Number of index cursor seeks",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
    {
      bsonKey: "dupsTested",
      description: "Number of keys tested for duplicates (multikey)",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
    {
      bsonKey: "dupsDropped",
      description: "Number of duplicate keys dropped (multikey)",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
  ],
} as const;
