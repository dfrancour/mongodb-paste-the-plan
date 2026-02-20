import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $project: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$project"),

  fullName: "Project Stage",
  description:
    "Reshapes documents by selecting, excluding, or computing fields. " +
    "Can include/exclude fields, rename fields, or add computed fields using expressions.",
  category: StageCategory.Transformation,
  iconName: "Layers",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/",

  sourceFile: "src/mongo/db/pipeline/document_source_project.h",
} as const;
