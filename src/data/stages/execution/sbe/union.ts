import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds } from "../../types";

export const union: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("union"),

  fullName: "SBE Union",
  description:
    "Combines values from multiple input streams into one stream. " +
    "Executes each branch in turn until EOF, remapping slots to common output.",
  category: StageCategory.Filter,
  iconName: "Filter",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Executes branches sequentially, not in parallel. " +
    "Exhausts each branch completely before moving to the next. " +
    "Results from all branches are combined into a single output stream.",

  sourceFile: "src/mongo/db/exec/sbe/stages/union.h",
} as const;
