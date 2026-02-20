import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $planCacheStats: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$planCacheStats"),

  fullName: "Plan Cache Statistics",
  description:
    "Returns plan cache information for collection. " +
    "Shows cached query plans and their performance statistics.",
  category: StageCategory.SystemMetadata,
  iconName: "BarChart3",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/planCacheStats/",

  sourceFile: "src/mongo/db/pipeline/document_source_plan_cache_stats.h",
} as const;
