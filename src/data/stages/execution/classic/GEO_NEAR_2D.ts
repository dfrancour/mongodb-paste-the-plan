import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const GEO_NEAR_2D: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("GEO_NEAR_2D"),
  querySolutionStageType: QuerySolutionStageType.STAGE_GEO_NEAR_2D,

  fullName: "2D Geospatial Near",
  description:
    "Finds documents near a point using 2d geospatial index. Returns results " +
    "sorted by distance from the query point.",
  category: StageCategory.Geospatial,
  iconName: "MapPin",

  blockingStage: true,
  canSpillToDisk: false,

  performanceNotes:
    "Blocking stage - must fetch and sort all matching documents by distance. " +
    "Uses 2d index for initial candidate selection, then computes exact distances. " +
    "Implicitly includes document fetch and distance-based sort. " +
    "Performance depends on search radius and document density.",

  sourceFile: "src/mongo/db/exec/classic/geo_near.h",
} as const;
