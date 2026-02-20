import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $indexStats: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$indexStats"),

  fullName: "Index Statistics",
  description:
    "Returns statistics about index usage for collection. " +
    "Shows how often each index has been accessed since server start.",
  category: StageCategory.SystemMetadata,
  iconName: "BarChart3",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/",

  sourceFile: "src/mongo/db/pipeline/document_source_index_stats.h",
} as const;
