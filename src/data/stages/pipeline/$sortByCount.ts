import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $sortByCount: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$sortByCount"),

  fullName: "Sort By Count",
  description:
    "Groups documents by expression and sorts by count in descending order. " +
    "Shorthand for { $group: { _id: <expression>, count: { $sum: 1 } }, $sort: { count: -1 } }.",
  category: StageCategory.Sort,
  iconName: "SortAsc",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/sortByCount/",

  sourceFile: "src/mongo/db/pipeline/document_source_sort_by_count.h",
} as const;
