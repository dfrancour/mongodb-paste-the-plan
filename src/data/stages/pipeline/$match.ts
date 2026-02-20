import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $match: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$match"),

  fullName: "Match Stage",
  description:
    "Filters documents in aggregation pipeline. Functions like find() queries - " +
    "only passes documents matching specified conditions to next stage.",
  category: StageCategory.Filter,
  iconName: "Filter",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/match/",

  sourceFile: "src/mongo/db/pipeline/document_source_match.h",
} as const;
