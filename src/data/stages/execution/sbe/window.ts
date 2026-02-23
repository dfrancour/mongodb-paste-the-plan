import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";
import { SPILLING_FIELDS } from "../../fields/spilling";

export const window: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("window"),
  querySolutionStageType: QuerySolutionStageType.STAGE_WINDOW,

  fullName: "SBE Window",
  description:
    "Performs partitioned sliding window aggregations for $setWindowFields. " +
    "Maintains window frames within partitions, evaluating window functions over sliding ranges.",
  category: StageCategory.Window,
  iconName: "Rows3",

  blockingStage: false,
  canSpillToDisk: true,

  performanceNotes:
    "Semi-blocking stage - buffers documents within each partition. " +
    "Can spill window buffer to disk when memory threshold is exceeded " +
    "(controlled by internalDocumentSourceSetWindowFieldsMaxMemoryBytes). " +
    "Output streams as each partition completes. " +
    "Window frame bounds (e.g., 'unbounded' vs 'N preceding') affect how many documents " +
    "must be buffered at once.",

  sourceFile: "src/mongo/db/exec/sbe/stages/window.h",

  explainFields: [...SPILLING_FIELDS],
} as const;
