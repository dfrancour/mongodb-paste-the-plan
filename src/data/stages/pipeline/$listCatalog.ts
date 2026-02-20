import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $listCatalog: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$listCatalog"),

  fullName: "List Catalog",
  description:
    "Returns catalog information for collections and views in a database. " +
    "Provides metadata about collection options, indexes, and storage details.",
  category: StageCategory.SystemMetadata,
  iconName: "List",

  introducedIn: "7.0",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/listCatalog/",

  sourceFile: "src/mongo/db/pipeline/document_source_list_catalog.h",
} as const;
