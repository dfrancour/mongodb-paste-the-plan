import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds } from "../../types";

export const block_to_row: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("block_to_row"),

  fullName: "SBE Block to Row",
  description:
    "Converts block-based columnar data to row-based format. Deblocks values " +
    "from ValueBlocks or CellBlocks into individual row values.",
  category: StageCategory.Internal,
  iconName: "Rows3",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Extracts individual values from blocks one at a time. " +
    "All input blocks must be same size. Supports optional bitmap filtering. " +
    "Used to transition from block processing to row processing. " +
    "Memory for deblocked values owned by the input blocks.",

  sourceFile: "src/mongo/db/exec/sbe/stages/block_to_row.h",
} as const;
