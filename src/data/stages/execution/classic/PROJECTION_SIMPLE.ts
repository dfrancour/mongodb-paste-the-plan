import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const PROJECTION_SIMPLE: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("PROJECTION_SIMPLE"),
  querySolutionStageType: QuerySolutionStageType.STAGE_PROJECTION_SIMPLE,

  fullName: "Simple Projection",
  description:
    "Optimized projection for simple field inclusion/exclusion without expressions. " +
    "Faster than default projection when only including or excluding fields.",
  category: StageCategory.Transformation,
  iconName: "Layers",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. More efficient than PROJECTION_DEFAULT. " +
    "Used when projection is simple inclusion/exclusion without computed fields. " +
    "Faster field traversal and copying. Still requires full document fetch.",

  sourceFile: "src/mongo/db/exec/classic/projection.h",
} as const;
