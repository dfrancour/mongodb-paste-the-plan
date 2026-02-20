import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const replace_root: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("replace_root"),
  querySolutionStageType: QuerySolutionStageType.STAGE_REPLACE_ROOT,

  fullName: "SBE Replace Root",
  description:
    "SBE engine's implementation of document root replacement. " +
    "Evaluates an expression for each input document and replaces the root " +
    "with the result.",
  category: StageCategory.Transformation,
  iconName: "Layers",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Transforms each document individually " +
    "by evaluating the replacement expression in the SBE VM.",

  sourceFile: "src/mongo/db/query/stage_builder/sbe/builder.cpp",
} as const;
