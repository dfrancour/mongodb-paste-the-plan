import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds } from "../../types";

export const VIRTUAL_SCAN: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("VIRTUAL_SCAN"),

  fullName: "Virtual Collection Scan",
  description:
    "Simulates a collection scan without depending on underlying storage. " +
    "Used for testing and providing in-memory data to query execution.",
  category: StageCategory.Internal,
  iconName: "Cog",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Iterates over in-memory array of documents. " +
    "Does not touch storage layer - purely in-memory operation. " +
    "Primarily used for testing query execution without real collections. " +
    "Also used internally for certain optimizations and special query patterns. " +
    "Very fast since no disk I/O involved.",

  sourceFile: "src/mongo/db/exec/classic/virtual_scan.h",

  // Testing-only in-memory scan — no explain-visible metrics beyond common fields
  explainFields: [],
} as const;
