import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const PROJECTION_DEFAULT: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("PROJECTION_DEFAULT"),
  querySolutionStageType: QuerySolutionStageType.STAGE_PROJECTION_DEFAULT,

  fullName: "Default Projection",
  description:
    "Standard field projection that computes projected fields from full documents. " +
    "Handles complex projections including computed fields and expressions.",
  category: StageCategory.Transformation,
  iconName: "Layers",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Processes one document at a time. " +
    "Most general projection implementation supporting all projection types. " +
    "Requires full document fetch - cannot use index-only data. " +
    "Performance depends on projection complexity and document size.",

  sourceFile: "src/mongo/db/exec/classic/projection.h",
} as const;
