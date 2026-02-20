import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $merge: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$merge"),

  fullName: "Merge to Collection",
  description:
    "Merges aggregation results into output collection. " +
    "Can insert new documents, replace existing ones, or merge fields.",
  category: StageCategory.Writes,
  iconName: "Edit",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/",

  sourceFile: "src/mongo/db/pipeline/document_source_merge.h",
} as const;
