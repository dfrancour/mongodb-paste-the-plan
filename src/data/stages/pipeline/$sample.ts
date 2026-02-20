import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $sample: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$sample"),

  fullName: "Random Sample",
  description:
    "Randomly selects specified number of documents from input. " +
    "Uses different algorithms based on sample size and collection characteristics.",
  category: StageCategory.Filter,
  iconName: "Filter",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/sample/",

  sourceFile: "src/mongo/db/pipeline/document_source_sample.h",
} as const;
