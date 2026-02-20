import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $search: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$search"),

  fullName: "Atlas Search",
  description:
    "Performs full-text search using Atlas Search indexes. " +
    "Supports fuzzy matching, autocomplete, scoring, and facets.",
  category: StageCategory.TextSearch,
  iconName: "BookA",

  docsUrl: "https://www.mongodb.com/docs/atlas/atlas-search/query-syntax/",

  sourceFile: "src/mongo/db/pipeline/search/document_source_search.h",
} as const;
