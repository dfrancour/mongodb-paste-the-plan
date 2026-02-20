import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const TEXT_MATCH: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("TEXT_MATCH"),
  querySolutionStageType: QuerySolutionStageType.STAGE_TEXT_MATCH,

  fullName: "Text Match",
  description:
    "Filters documents based on text search criteria. Evaluates text search " +
    "expressions and scores results by relevance.",
  category: StageCategory.Filter,
  iconName: "Filter",

  // Note: $text is a query operator, not a pipeline stage.
  // TEXT_MATCH is used when processing text queries in $match or find().

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Evaluates text search predicates on documents. " +
    "Works with text index scan results. Computes text relevance scores. " +
    "Performance depends on text complexity and number of terms.",

  sourceFile: "src/mongo/db/exec/classic/text_match.h",
} as const;
