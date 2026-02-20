import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $unset: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$unset"),

  fullName: "Unset Fields Stage",
  description:
    "Removes specified fields from documents. " +
    "Shorthand for exclusion projection using $project.",
  category: StageCategory.Transformation,
  iconName: "Layers",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/unset/",

  sourceFile: "src/mongo/db/pipeline/document_source_project.h",
} as const;
