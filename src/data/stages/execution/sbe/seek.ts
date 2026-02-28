import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const seek: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("seek"),
  querySolutionStageType: QuerySolutionStageType.STAGE_FETCH,

  fullName: "SBE Seek",
  description:
    "Seeks to a specific document by RecordId in SBE engine. Typically appears after an index scan " +
    "to fetch the full document using the RecordId returned by the index. This is a variant of " +
    "the scan stage that performs a point lookup rather than a sequential scan.",
  category: StageCategory.Fetch,
  iconName: "FileSearch",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Performs a single seek operation to fetch a document by its " +
    "RecordId. More efficient than a full collection scan when fetching specific documents. " +
    "Index key consistency checks may be performed to detect snapshot inconsistencies after yields.",

  sourceFile: "src/mongo/db/exec/sbe/stages/scan.h",

  // Shares ScanStats with scan stage (sbe/stages/plan_stats.h)
  explainFields: [
    {
      bsonKey: "numReads",
      description: "Number of document reads by RecordId",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
  ],
} as const;
