import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $set: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$set"),

  fullName: "Set Fields Stage",
  description:
    "Sets or modifies field values in documents. Alias for $addFields introduced in MongoDB 4.2. " +
    "Can add new fields or overwrite existing ones using expressions.",
  category: StageCategory.Transformation,
  iconName: "Layers",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/set/",

  sourceFile: "src/mongo/db/pipeline/document_source_add_fields.h",
} as const;
