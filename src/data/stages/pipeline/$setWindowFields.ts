import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $setWindowFields: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$setWindowFields"),

  fullName: "Set Window Fields",
  description:
    "Performs window function operations like running totals, moving averages, and rankings. " +
    "Partitions documents and computes aggregations over sliding windows.",
  category: StageCategory.Window,
  iconName: "Rows3",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/",

  sourceFile: "src/mongo/db/pipeline/document_source_set_window_fields.h",
} as const;
