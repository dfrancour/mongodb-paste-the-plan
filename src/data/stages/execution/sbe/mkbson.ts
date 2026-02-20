import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds } from "../../types";

export const mkbson: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("mkbson"),

  fullName: "SBE Make BSON Object",
  description:
    "Constructs BSON objects from input slots. Similar to mkobj but produces " +
    "BSON-encoded objects instead of SBE value objects.",
  category: StageCategory.Transformation,
  iconName: "Layers",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Constructs one BSON object per input row. " +
    "Produces BSON-encoded output, which may be required for returning results to clients. " +
    "Slightly more overhead than mkobj due to BSON serialization.",

  sourceFile: "src/mongo/db/exec/sbe/stages/makeobj.h",
} as const;
