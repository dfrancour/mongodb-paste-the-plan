import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const unwind: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("unwind"),
  querySolutionStageType: QuerySolutionStageType.STAGE_UNWIND,

  fullName: "SBE Unwind",
  description:
    "Returns array elements one-by-one with associated array indices. " +
    "Reads array from input slot, outputs elements and indices to separate slots.",
  category: StageCategory.Transformation,
  iconName: "Layers",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Produces one row per array element. " +
    "Can optionally preserve null and empty arrays with preserveNullAndEmptyArrays flag. " +
    "Generally efficient unless arrays are very large.",

  sourceFile: "src/mongo/db/exec/sbe/stages/unwind.h",
} as const;
