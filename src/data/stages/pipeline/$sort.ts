import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $sort: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$sort"),

  fullName: "Sort Stage",
  description:
    "Sorts documents in aggregation pipeline by specified fields. " +
    "Can sort in ascending or descending order on multiple fields.",
  category: StageCategory.Sort,
  iconName: "SortAsc",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort/",

  sourceFile: "src/mongo/db/pipeline/document_source_sort.h",
} as const;
