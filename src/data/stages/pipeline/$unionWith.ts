import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $unionWith: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$unionWith"),

  fullName: "Union With Collection",
  description:
    "Combines results from current pipeline with documents from another collection. " +
    "Similar to SQL UNION ALL operation.",
  category: StageCategory.Filter,
  iconName: "Filter",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/unionWith/",

  sourceFile: "src/mongo/db/pipeline/document_source_union_with.h",
} as const;
