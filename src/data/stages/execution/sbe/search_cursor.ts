import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const search_cursor: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("search_cursor"),
  querySolutionStageType: QuerySolutionStageType.STAGE_SEARCH,

  fullName: "SBE Search Cursor",
  description:
    "Maintains a mongot cursor for $search queries. Retrieves search results " +
    "from the remote mongot service and outputs documents with metadata.",
  category: StageCategory.TextSearch,
  iconName: "BookA",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Fetches one response from mongot per getNext() call. " +
    "Supports both stored source (full documents) and non-stored source (IDs only). " +
    "Can extract specific fields and metadata into separate slots. " +
    "Performance depends on network latency to mongot service. " +
    "Supports sort spec, limit, and collation for server-side optimization.",

  sourceFile: "src/mongo/db/exec/sbe/stages/search_cursor.h",

  // Source: sbe::SearchStats (sbe/stages/plan_stats.h:429)
  explainFields: [
    {
      bsonKey: "msWaitingForMongot",
      description: "Time waiting for mongot search service",
      valueType: "number",
      verbosity: "executionStats",
      unit: "ms",
    },
    {
      bsonKey: "batchNum",
      description: "Batch number from mongot service",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
  ],
} as const;
