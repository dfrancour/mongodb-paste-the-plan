import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds } from "../../types";

export const unique: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("unique"),

  fullName: "SBE Unique",
  description:
    "Deduplicates rows by key using a hash set. Unlike hash aggregation, " +
    "this stage is non-blocking and preserves input order.",
  category: StageCategory.Filter,
  iconName: "Filter",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Maintains hash set of seen keys in memory. " +
    "Preserves input order - first occurrence of each key is returned. " +
    "Memory usage grows with the number of unique keys encountered.",

  sourceFile: "src/mongo/db/exec/sbe/stages/unique.h",
} as const;
