import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $skip: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$skip"),

  fullName: "Skip Stage",
  description:
    "Skips specified number of documents and passes remaining documents to next stage. " +
    "Often used with $limit for pagination.",
  category: StageCategory.Filter,
  iconName: "Filter",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/skip/",

  sourceFile: "src/mongo/db/pipeline/document_source_skip.h",
} as const;
