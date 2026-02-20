import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $group: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$group"),

  fullName: "Group Stage",
  description:
    "Groups documents by specified _id expression and computes aggregations. " +
    "Similar to SQL GROUP BY clause.",
  category: StageCategory.Aggregation,
  iconName: "Group",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/",

  sourceFile: "src/mongo/db/pipeline/document_source_group.h",
} as const;
