import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const fetch: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("fetch"),
  querySolutionStageType: QuerySolutionStageType.STAGE_FETCH,

  fullName: "SBE Fetch",
  description:
    "Fetches full documents by record ID in SBE engine. Typically appears after an index scan " +
    "when the query requires fields not covered by the index.",
  category: StageCategory.Fetch,
  iconName: "FileSearch",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Performs random disk I/O to fetch documents. " +
    "Can be a performance bottleneck when fetching many documents.",

  sourceFile: "src/mongo/db/exec/sbe/stages/fetch.h",

  explainFields: [
    {
      bsonKey: "numReads",
      description: "Number of documents fetched from storage",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
  ],
} as const;
