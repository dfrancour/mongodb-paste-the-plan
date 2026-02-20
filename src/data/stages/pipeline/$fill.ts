import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $fill: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$fill"),

  fullName: "Fill Missing Values",
  description:
    "Fills null or missing field values using specified fill methods. " +
    "Supports forward fill, backward fill, and linear interpolation.",
  category: StageCategory.Internal,
  iconName: "Layers",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/fill/",

  sourceFile: "src/mongo/db/pipeline/document_source_fill.h",
} as const;
