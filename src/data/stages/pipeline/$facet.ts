import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $facet: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$facet"),

  fullName: "Facet Stage",
  description:
    "Processes multiple aggregation pipelines within single stage on same input. " +
    "Returns object with results from each pipeline as separate arrays.",
  category: StageCategory.Internal,
  iconName: "GitFork",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/",

  sourceFile: "src/mongo/db/pipeline/document_source_facet.h",
} as const;
