import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $lookup: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$lookup"),

  fullName: "Lookup Stage",
  description:
    "Performs left outer join with another collection to combine documents. " +
    "Adds matched documents from joined collection as array field.",
  category: StageCategory.Join,
  iconName: "Link",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/",

  sourceFile: "src/mongo/db/pipeline/document_source_lookup.h",
} as const;
