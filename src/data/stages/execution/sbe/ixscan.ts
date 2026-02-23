import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const ixscan: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("ixscan"),
  querySolutionStageType: QuerySolutionStageType.STAGE_IXSCAN,

  fullName: "SBE Index Scan",
  description:
    "Scans an index in the slot-based execution engine. " +
    "Projects values from the index key and returns RecordIds for fetching documents.",
  category: StageCategory.IndexScan,
  iconName: "Search",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Scans index entries in order. " +
    "Supports both forward and backward scans. Generally faster than collection scans for selective queries. " +
    "Often followed by a fetch stage if non-indexed fields are needed.",

  sourceFile: "src/mongo/db/exec/sbe/stages/ix_scan.h",

  explainFields: [
    {
      bsonKey: "seeks",
      description: "Number of index cursor seeks",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
    {
      bsonKey: "keysExamined",
      description: "Number of index keys examined",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
    {
      bsonKey: "keyCheckSkipped",
      description: "Key checks skipped (optimization)",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
    {
      bsonKey: "numReads",
      description: "Number of index entries read",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
  ],
} as const;
