import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $addFields: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$addFields"),

  fullName: "Add Fields Stage",
  description:
    "Adds new computed fields to documents. " +
    "Can use expressions to calculate field values based on existing fields.",
  category: StageCategory.Transformation,
  iconName: "Layers",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/addFields/",

  sourceFile: "src/mongo/db/pipeline/document_source_add_fields.h",
} as const;
