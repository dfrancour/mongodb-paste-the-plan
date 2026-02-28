import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds } from "../../types";

export const random: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("random"),

  fullName: "SBE Random Scan",
  description:
    "Retrieves documents from a collection in random order using the storage engine's " +
    "random cursor. Used for efficient random sampling operations.",
  category: StageCategory.Internal,
  iconName: "Shuffle",

  blockingStage: false,
  canSpillToDisk: false,

  introducedIn: "8.0",

  performanceNotes:
    "Non-blocking streaming stage. Uses storage engine's random cursor for efficient " +
    "sampling without scanning the entire collection.",

  sourceFile: "src/mongo/db/exec/sbe/stages/random_scan.h",

  // Storage engine random cursor — no stage-specific metrics beyond SBE common fields
  explainFields: [],
} as const;
