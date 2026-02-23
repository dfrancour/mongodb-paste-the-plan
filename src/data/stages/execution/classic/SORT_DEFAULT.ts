import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";
import { SORT_STAGE_FIELDS } from "../../fields/sort";

export const SORT_DEFAULT: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("SORT_DEFAULT"),
  querySolutionStageType: QuerySolutionStageType.STAGE_SORT_DEFAULT,

  fullName: "Default In-Memory Sort",
  description:
    "Default sorting implementation for documents when no index supports the sort order. " +
    "Handles complex sort patterns and all BSON data types.",
  category: StageCategory.Sort,
  iconName: "SortAsc",

  blockingStage: true,
  canSpillToDisk: true,

  performanceNotes:
    "Blocking stage - must consume all input before producing output. " +
    "Can spill to disk when memory limit exceeded (default 100MB). " +
    "Handles complex sort patterns including collations, arrays, and all BSON types. " +
    "When combined with LIMIT, can use a more efficient top-K algorithm that only tracks " +
    "the top N documents rather than sorting everything.",

  sourceFile: "src/mongo/db/exec/classic/sort.h",

  // Shares SortStats struct and statsToBSON() path with SORT and SORT_SIMPLE
  explainFields: [...SORT_STAGE_FIELDS],
} as const;
