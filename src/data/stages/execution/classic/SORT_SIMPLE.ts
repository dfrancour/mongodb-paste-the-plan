import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";
import { SORT_STAGE_FIELDS } from "../../fields/sort";

export const SORT_SIMPLE: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("SORT_SIMPLE"),
  querySolutionStageType: QuerySolutionStageType.STAGE_SORT_SIMPLE,

  fullName: "Simple In-Memory Sort",
  description:
    "Optimized sorting implementation for simple sort patterns. " +
    "Used when sort can be performed more efficiently than default sort.",
  category: StageCategory.Sort,
  iconName: "SortAsc",

  blockingStage: true,
  canSpillToDisk: true,

  performanceNotes:
    "Blocking stage - must consume all input before producing output. " +
    "Can spill to disk when memory limit exceeded (default 100MB). " +
    "Optimized for simple sort patterns without complex collations. " +
    "Query planner selects this variant when the sort pattern qualifies.",

  sourceFile: "src/mongo/db/exec/classic/sort.h",

  // Shares SortStats struct and statsToBSON() path with SORT and SORT_DEFAULT
  explainFields: [...SORT_STAGE_FIELDS],
} as const;
