import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $replaceWith: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$replaceWith"),

  fullName: "Replace With",
  description:
    "Alias for $replaceRoot. Replaces input document with the specified document. " +
    "Shorthand syntax that takes an expression directly instead of {newRoot: <expression>}.",
  category: StageCategory.Transformation,
  iconName: "Layers",

  introducedIn: "4.2",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceWith/",

  sourceFile: "src/mongo/db/pipeline/document_source_replace_root.h",
} as const;
