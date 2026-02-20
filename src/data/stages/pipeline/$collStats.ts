import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $collStats: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$collStats"),

  fullName: "Collection Statistics",
  description:
    "Returns statistics about collection or view including storage stats, count, and index details.",
  category: StageCategory.SystemMetadata,
  iconName: "BarChart3",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/collStats/",

  sourceFile: "src/mongo/db/pipeline/document_source_coll_stats.h",
} as const;
