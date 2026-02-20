import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const PROJECTION_COVERED: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("PROJECTION_COVERED"),
  querySolutionStageType: QuerySolutionStageType.STAGE_PROJECTION_COVERED,

  fullName: "Covered Projection",
  description:
    "Projection that returns fields directly from index data. " +
    "No document fetch required - query is entirely covered by the index.",
  category: StageCategory.Transformation,
  iconName: "Layers",

  blockingStage: false,
  canSpillToDisk: false,

  isCoveredQueryIndicator: true,

  performanceNotes:
    "Non-blocking streaming stage. Avoids document fetch entirely. " +
    "All projected fields come from index data. " +
    "Requires index containing all projected fields and query predicates.",

  sourceFile: "src/mongo/db/exec/classic/projection.h",
} as const;
