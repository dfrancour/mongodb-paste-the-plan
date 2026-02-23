import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";
import { SPILLING_FIELDS } from "../../fields/spilling";

export const GEO_NEAR_2DSPHERE: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("GEO_NEAR_2DSPHERE"),
  querySolutionStageType: QuerySolutionStageType.STAGE_GEO_NEAR_2DSPHERE,

  fullName: "2DSphere Geospatial Near",
  description:
    "Finds documents near a point on a sphere using 2dsphere geospatial index. " +
    "Returns results sorted by distance, supporting spherical geometry.",
  category: StageCategory.Geospatial,
  iconName: "MapPin",

  blockingStage: true,
  canSpillToDisk: true,

  performanceNotes:
    "Blocking stage - must fetch and sort all matching documents by distance. " +
    "Uses 2dsphere index with spherical geometry calculations. " +
    "More accurate than 2d for Earth-based coordinates (lat/long). " +
    "Implicitly includes document fetch and distance-based sort.",

  sourceFile: "src/mongo/db/exec/classic/geo_near.h",

  explainFields: [
    {
      bsonKey: "keyPattern",
      description: "Geospatial index key specification",
      valueType: "object",
      verbosity: "queryPlanner",
    },
    {
      bsonKey: "indexName",
      description: "Name of the geospatial index",
      valueType: "string",
      verbosity: "queryPlanner",
    },
    {
      bsonKey: "indexVersion",
      description: "Index version",
      valueType: "number",
      verbosity: "queryPlanner",
    },
    {
      bsonKey: "searchIntervals",
      description: "Distance intervals searched with buffered/returned counts",
      valueType: "object",
      verbosity: "executionStats",
    },
    ...SPILLING_FIELDS,
  ],
} as const;
