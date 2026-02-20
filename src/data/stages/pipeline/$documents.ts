import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $documents: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$documents"),

  fullName: "Create Documents",
  description:
    "Creates documents from literal values specified in pipeline. " +
    "Useful for testing or generating synthetic data without collection.",
  category: StageCategory.SystemMetadata,
  iconName: "Braces",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/documents/",

  sourceFile: "src/mongo/db/pipeline/document_source_documents.h",
} as const;
