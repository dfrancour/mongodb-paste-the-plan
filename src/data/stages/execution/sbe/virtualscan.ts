import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds } from "../../types";

export const virtualscan: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("virtualscan"),

  fullName: "SBE Virtual Scan",
  description:
    "Test/utility stage that returns values from a pre-loaded array one at a time. " +
    "Mimics resource management behavior of real scan stages for testing.",
  category: StageCategory.Internal,
  iconName: "Cog",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Returns one value at a time from an in-memory array. " +
    "Primarily used for internal testing purposes. " +
    "Unlikely to appear in production query plans.",

  sourceFile: "src/mongo/db/exec/sbe/stages/virtual_scan.h",
} as const;
