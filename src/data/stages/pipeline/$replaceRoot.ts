import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $replaceRoot: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$replaceRoot"),

  fullName: "Replace Root",
  description:
    "Replaces input document with specified document, promoting embedded document to top level. " +
    "Useful for restructuring documents or promoting nested fields.",
  category: StageCategory.Transformation,
  iconName: "Layers",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceRoot/",

  sourceFile: "src/mongo/db/pipeline/document_source_replace_root.h",
} as const;
