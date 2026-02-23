import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const GEO_NEAR_2D: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("GEO_NEAR_2D"),
  querySolutionStageType: QuerySolutionStageType.STAGE_GEO_NEAR_2D,

  fullName: "2D Geospatial Near",
  description:
    "The query planner selects a 2d geospatial near query. Finds documents " +
    "near a point using a 2d index and returns results sorted by distance.",
  category: StageCategory.Geospatial,
  iconName: "MapPin",

  builtFromUserSyntax: [StageIds.pipeline("$geoNear")],

  blockingStage: true,
  canSpillToDisk: false,

  performanceNotes:
    "Blocking stage — must fetch and sort all matching documents by " +
    "distance. Implicitly includes document fetch and distance-based sort. " +
    "Performance depends on search radius and document density.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [
    {
      bsonKey: "keyPattern",
      description: "2d index key specification",
      valueType: "object",
      verbosity: "queryPlanner",
    },
    {
      bsonKey: "indexName",
      description: "Name of the 2d index used",
      valueType: "string",
      verbosity: "queryPlanner",
    },
    {
      bsonKey: "indexVersion",
      description: "2d index version",
      valueType: "number",
      verbosity: "queryPlanner",
    },
  ],
} as const;
