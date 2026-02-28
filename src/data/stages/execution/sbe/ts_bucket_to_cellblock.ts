import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds } from "../../types";

export const ts_bucket_to_cellblock: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("ts_bucket_to_cellblock"),

  fullName: "SBE Time Series Bucket to CellBlock",
  description:
    "Converts time series bucket BSON documents to CellBlock columnar format. " +
    "Extracts requested paths into separate cell blocks for efficient processing.",
  category: StageCategory.TimeSeries,
  iconName: "Clock",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Processes one time series bucket at a time. " +
    "Produces columnar data structures for efficient processing of time series data. " +
    "Enables block-based processing optimizations for time series queries.",

  sourceFile: "src/mongo/db/exec/sbe/stages/ts_bucket_to_cell_block.h",

  // Source: sbe::TsBucketToBlockStats (sbe/stages/plan_stats.h:450)
  explainFields: [
    {
      bsonKey: "numStorageBlocksDecompressed",
      description: "Storage blocks decompressed from buckets",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
    {
      bsonKey: "numStorageBlocks",
      description: "Total storage blocks processed",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
    {
      bsonKey: "numCellBlocksProduced",
      description: "Cell blocks produced for downstream processing",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
  ],
} as const;
