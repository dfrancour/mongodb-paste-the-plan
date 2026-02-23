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

  explainFields: [
    {
      bsonKey: "dupsTested",
      description: "Number of keys tested for duplicates",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
    {
      bsonKey: "dupsDropped",
      description: "Number of duplicate keys dropped",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
    {
      bsonKey: "peakTrackedMemBytes",
      description: "Peak tracked memory usage",
      valueType: "number",
      verbosity: "executionStats",
      unit: "bytes",
    },
  ],
} as const;
