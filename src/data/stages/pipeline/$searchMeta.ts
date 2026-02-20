import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $searchMeta: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$searchMeta"),

  fullName: "Atlas Search Metadata",
  description:
    "Returns metadata about Atlas Search query execution without returning documents. " +
    "Useful for getting facet counts and search statistics.",
  category: StageCategory.TextSearch,
  iconName: "BookA",

  docsUrl: "https://www.mongodb.com/docs/atlas/atlas-search/query-syntax/",

  sourceFile: "src/mongo/db/pipeline/search/document_source_search_meta.h",
} as const;
