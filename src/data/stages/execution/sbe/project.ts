import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const project: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("project"),
  querySolutionStageType: QuerySolutionStageType.STAGE_PROJECTION_DEFAULT,

  fullName: "SBE Project",
  description:
    "Projects and computes new fields in SBE engine. " +
    "Evaluates expressions to create output slots from input slots.",
  category: StageCategory.Transformation,
  iconName: "Layers",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Evaluates expressions to compute projected fields. " +
    "Performance depends on the complexity of projection expressions.",

  sourceFile: "src/mongo/db/exec/sbe/stages/project.h",
} as const;
