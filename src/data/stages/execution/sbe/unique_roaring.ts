import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds } from "../../types";

export const unique_roaring: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("unique_roaring"),

  fullName: "SBE Unique with Roaring Bitmap",
  description:
    "Specialized deduplication stage for single integral keys using roaring bitmaps. " +
    "More memory-efficient than unique for integer keys.",
  category: StageCategory.Filter,
  iconName: "Filter",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Uses roaring bitmap for memory-efficient deduplication. " +
    "Only supports single integral key (not composite keys). " +
    "More memory-efficient than a hash set when deduplicating integer keys. " +
    "Preserves input order.",

  sourceFile: "src/mongo/db/exec/sbe/stages/unique.h",

  // Shares UniqueStats with unique stage (sbe/stages/plan_stats.h:187)
  explainFields: [
    {
      bsonKey: "dupsTested",
      description: "Keys tested for duplicates",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
    {
      bsonKey: "dupsDropped",
      description: "Duplicate keys dropped",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
  ],
} as const;
