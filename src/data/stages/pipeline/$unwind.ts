import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $unwind: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$unwind"),

  fullName: "Unwind Stage",
  description:
    "Deconstructs array field into separate documents - one document per array element. " +
    "Useful for denormalizing arrays and aggregating array elements.",
  category: StageCategory.Transformation,
  iconName: "Layers",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/",

  sourceFile: "src/mongo/db/pipeline/document_source_unwind.h",
} as const;
