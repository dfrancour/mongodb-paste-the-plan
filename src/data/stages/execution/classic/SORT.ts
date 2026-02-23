import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";
import { SORT_STAGE_FIELDS } from "../../fields/sort";

export const SORT: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("SORT"),
  querySolutionStageType: QuerySolutionStageType.STAGE_SORT_DEFAULT,

  fullName: "In-Memory Sort",
  description:
    "Sorts documents in memory when no index supports the sort order. " +
    "Loads all input documents, sorts them, then returns sorted results.",
  category: StageCategory.Sort,
  iconName: "SortAsc",

  blockingStage: true,
  canSpillToDisk: true,

  performanceNotes:
    "Blocking stage - must consume all input before producing output. " +
    "Can spill to disk when memory limit exceeded (default 100MB, controlled by " +
    "internalQueryMaxBlockingSortMemoryUsageBytes). " +
    "Consider adding an index to avoid in-memory sorting.",

  analysisNote: "In-memory sort - consider an index that provides sort order",

  sourceFile: "src/mongo/db/exec/classic/sort.h",

  explainFields: [...SORT_STAGE_FIELDS],
} as const;
