import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const TEXT_OR: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("TEXT_OR"),
  querySolutionStageType: QuerySolutionStageType.STAGE_TEXT_OR,

  fullName: "Text OR",
  description:
    "Combines results from multiple text search terms using OR logic. " +
    "Merges and deduplicates text search results from different terms.",
  category: StageCategory.Filter,
  iconName: "Filter",

  // Note: $text is a query operator, not a pipeline stage.
  // TEXT_OR is used when processing text queries in $match or find().

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Merges results from multiple text search terms. " +
    "Deduplicates documents matching multiple terms. " +
    "Aggregates text scores across terms. Used internally for text search queries.",

  sourceFile: "src/mongo/db/exec/classic/text_or.h",
} as const;
