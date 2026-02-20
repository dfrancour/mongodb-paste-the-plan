import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $densify: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$densify"),

  fullName: "Densify",
  description:
    "Fills gaps in time series data by creating documents for missing intervals. " +
    "Generates synthetic documents to create continuous time series.",
  category: StageCategory.Internal,
  iconName: "Clock",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/densify/",

  sourceFile: "src/mongo/db/pipeline/document_source_densify.h",
} as const;
