import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $cursor: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$cursor"),

  fullName: "Cursor Stage",
  description:
    "Internal stage that represents the cursor reading documents from a collection. " +
    "Appears in aggregation explain output when MongoDB optimizes the pipeline by " +
    "pushing filters and projections to the query layer.",
  category: StageCategory.Internal,
  iconName: "Database",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/",

  sourceFile: "src/mongo/db/pipeline/document_source_cursor.h",
} as const;
