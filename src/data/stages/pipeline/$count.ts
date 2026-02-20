import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $count: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$count"),

  fullName: "Count Stage",
  description:
    "Counts number of documents in pipeline and returns single document with count. " +
    "Equivalent to { $group: { _id: null, count: { $sum: 1 } } }.",
  category: StageCategory.Aggregation,
  iconName: "Calculator",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/count/",

  sourceFile: "src/mongo/db/pipeline/document_source_count.h",
} as const;
