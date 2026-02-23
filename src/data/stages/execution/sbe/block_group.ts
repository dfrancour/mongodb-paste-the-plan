import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds } from "../../types";
import { SPILLING_FIELDS } from "../../fields/spilling";

export const block_group: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("block_group"),

  fullName: "SBE Block Group",
  description:
    "Block-processing version of hash aggregation for columnar data. " +
    "Processes data in blocks for improved performance with columnar formats.",
  category: StageCategory.Aggregation,
  iconName: "Group",

  blockingStage: true,
  canSpillToDisk: true,

  performanceNotes:
    "Blocking stage that must consume all input before producing output. " +
    "Can spill to disk when memory limit is exceeded (default 100MB). " +
    "Works on blocks instead of individual rows for better cache locality. " +
    "Only supports algebraic accumulators (median not supported). " +
    "Two processing modes: tokenized (few unique keys) or element-wise (many unique keys). " +
    "Optimized for columnar and time-series workloads.",

  sourceFile: "src/mongo/db/exec/sbe/stages/block_hashagg.h",

  explainFields: [
    ...SPILLING_FIELDS,
    {
      bsonKey: "blockAccumulations",
      description: "Block-mode accumulations performed",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
    {
      bsonKey: "blockAccumulatorTotalCalls",
      description: "Total block accumulator invocations",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
    {
      bsonKey: "elementWiseAccumulations",
      description: "Element-wise accumulations (fallback from block mode)",
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
