import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $geoNear: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$geoNear"),

  fullName: "Geospatial Near",
  description:
    "Returns documents in order of proximity to geospatial point. " +
    "Adds calculated distance field and must be first stage in pipeline.",
  category: StageCategory.Geospatial,
  iconName: "MapPin",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/",

  sourceFile: "src/mongo/db/pipeline/document_source_geo_near.h",
} as const;
