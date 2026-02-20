import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds } from "../../types";

export const coscan: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("coscan"),

  fullName: "SBE Constant Scan",
  description:
    "Produces an infinite stream of ADVANCED results without any data. " +
    "Used to drive execution when no physical data source is needed.",
  category: StageCategory.Internal,
  iconName: "Cog",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage with minimal overhead. " +
    "Does not produce any values itself - just drives iteration. " +
    "Typically combined with project stages to produce constant values or drive nested loops.",

  sourceFile: "src/mongo/db/exec/sbe/stages/co_scan.h",
} as const;
