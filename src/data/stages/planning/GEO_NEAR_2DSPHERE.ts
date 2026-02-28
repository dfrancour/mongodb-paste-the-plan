import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const GEO_NEAR_2DSPHERE: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("GEO_NEAR_2DSPHERE"),
  querySolutionStageType: QuerySolutionStageType.STAGE_GEO_NEAR_2DSPHERE,

  fullName: "2DSphere Geospatial Near",
  description:
    "The query planner selects a 2dsphere geospatial near query. Finds " +
    "documents near a point on a sphere using spherical geometry calculations.",
  category: StageCategory.Geospatial,
  iconName: "MapPin",

  builtFromUserSyntax: [StageIds.pipeline("$geoNear")],

  blockingStage: true,
  canSpillToDisk: false,

  performanceNotes:
    "Blocking stage — must fetch and sort all matching documents by " +
    "distance. Uses 2dsphere index with spherical geometry. More accurate " +
    "than 2d for Earth-based coordinates (lat/long).",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [
    {
      bsonKey: "keyPattern",
      description: "2dsphere index key specification",
      valueType: "object",
      verbosity: "queryPlanner",
    },
    {
      bsonKey: "indexName",
      description: "Name of the 2dsphere index used",
      valueType: "string",
      verbosity: "queryPlanner",
    },
    {
      bsonKey: "indexVersion",
      description: "2dsphere index version",
      valueType: "number",
      verbosity: "queryPlanner",
    },
  ],
} as const;
