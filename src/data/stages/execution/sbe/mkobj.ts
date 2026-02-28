import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds } from "../../types";

export const mkobj: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("mkobj"),

  fullName: "SBE Make Object",
  description:
    "Constructs SBE objects from input slots. Can build new objects from scratch " +
    "or modify existing objects by adding, dropping, or keeping fields.",
  category: StageCategory.Transformation,
  iconName: "Layers",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Constructs one object per input row. " +
    "Can drop specified fields, keep only specified fields, or add new computed fields. " +
    "See also mkbson for BSON object construction.",

  sourceFile: "src/mongo/db/exec/sbe/stages/makeobj.h",

  // Pure slot-to-object transform — no stage-specific metrics beyond SBE common fields
  explainFields: [],
} as const;
