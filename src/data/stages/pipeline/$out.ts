import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $out: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$out"),

  fullName: "Output to Collection",
  description:
    "Writes aggregation results to specified collection, replacing existing collection. " +
    "Must be last stage in pipeline.",
  category: StageCategory.Writes,
  iconName: "Edit",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/",

  sourceFile: "src/mongo/db/pipeline/document_source_out.h",
} as const;
