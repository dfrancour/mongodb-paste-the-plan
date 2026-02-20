import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $redact: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$redact"),

  fullName: "Redact Documents",
  description:
    "Restricts document content based on document-level access control. " +
    "Recursively evaluates conditions to prune, descend, or keep document fields.",
  category: StageCategory.Filter,
  iconName: "Filter",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/redact/",

  sourceFile: "src/mongo/db/pipeline/document_source_redact.h",
} as const;
