import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $bucketAuto: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$bucketAuto"),

  fullName: "Automatic Bucket",
  description:
    "Automatically categorizes documents into specified number of buckets. " +
    "MongoDB determines bucket boundaries to evenly distribute documents.",
  category: StageCategory.Aggregation,
  iconName: "Group",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucketAuto/",

  sourceFile: "src/mongo/db/pipeline/document_source_bucket_auto.h",
} as const;
