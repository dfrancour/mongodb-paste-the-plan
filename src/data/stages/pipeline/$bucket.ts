import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $bucket: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$bucket"),

  fullName: "Bucket Stage",
  description:
    "Categorizes documents into buckets based on specified boundaries. " +
    "Performs histogram-like grouping with explicit bucket ranges.",
  category: StageCategory.Aggregation,
  iconName: "Group",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucket/",

  sourceFile: "src/mongo/db/pipeline/document_source_bucket.h",
} as const;
