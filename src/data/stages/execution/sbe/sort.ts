import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";
import { SPILLING_FIELDS } from "../../fields/spilling";

export const sort: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("sort"),
  querySolutionStageType: QuerySolutionStageType.STAGE_SORT_DEFAULT,

  fullName: "SBE Sort",
  description:
    "Sorts incoming data by specified order-by keys. Materializes rows in memory " +
    "and can spill to disk if memory limit is exceeded.",
  category: StageCategory.Sort,
  iconName: "SortAsc",

  blockingStage: true,
  canSpillToDisk: true,

  performanceNotes:
    "Blocking stage - must consume all input before producing output. " +
    "Materializes rows for sorting. Can be expensive for large result sets. " +
    "Spills to disk when memory limit exceeded if allowDiskUse is true. " +
    "Can be optimized to top-k sort if a limit is present.",

  analysisNote: "In-memory sort - consider an index that provides sort order",

  sourceFile: "src/mongo/db/exec/sbe/stages/sort.h",

  // SBE sort has no dedicated stats struct — sort configuration (pattern, limit, memory)
  // comes from the queryPlanner section. Only spilling fields are emitted at executionStats.
  explainFields: [...SPILLING_FIELDS],
} as const;
