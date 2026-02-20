import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds } from "../../types";

export const extract_field_paths: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("extract_field_paths"),

  fullName: "SBE Extract Field Paths",
  description:
    "Extracts nested field paths from input slots in a single pass. " +
    "Optimizes field access by computing multiple output paths from shared input slots.",
  category: StageCategory.Transformation,
  iconName: "Braces",

  blockingStage: false,
  canSpillToDisk: false,

  introducedIn: "8.0",

  performanceNotes:
    "Non-blocking streaming stage. Efficiently extracts multiple nested paths in one pass " +
    "over the input, avoiding repeated document traversal.",

  sourceFile: "src/mongo/db/exec/sbe/stages/extract_field_paths.h",
} as const;
