import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds } from "../../types";

export const bsonscan: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("bsonscan"),

  fullName: "SBE BSON Scan",
  description:
    "Test/utility stage that scans a pre-loaded vector of BSON documents. " +
    "Can optionally extract top-level fields into separate slots.",
  category: StageCategory.Internal,
  iconName: "Cog",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Returns one BSON document at a time. " +
    "Primarily used for testing and internal operations. " +
    "Documents are stored in-memory. Unlikely to appear in production query plans.",

  sourceFile: "src/mongo/db/exec/sbe/stages/bson_scan.h",
} as const;
