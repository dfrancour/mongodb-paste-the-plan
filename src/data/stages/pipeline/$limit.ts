import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $limit: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$limit"),

  fullName: "Limit Stage",
  description:
    "Limits number of documents passed to next stage in pipeline. " +
    "Returns only first N documents from previous stage.",
  category: StageCategory.Filter,
  iconName: "Filter",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/limit/",

  sourceFile: "src/mongo/db/pipeline/document_source_limit.h",
} as const;
