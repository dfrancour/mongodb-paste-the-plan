import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $listSearchIndexes: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$listSearchIndexes"),

  fullName: "List Search Indexes",
  description:
    "Returns information about existing Atlas Search indexes on a collection. " +
    "Can filter by index name or return all indexes.",
  category: StageCategory.SystemMetadata,
  iconName: "List",

  introducedIn: "7.0",

  docsUrl:
    "https://www.mongodb.com/docs/atlas/atlas-search/manage-indexes/#view-search-indexes",

  sourceFile:
    "src/mongo/db/pipeline/search/document_source_list_search_indexes.h",
} as const;
