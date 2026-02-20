import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const AND_SORTED: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("AND_SORTED"),
  querySolutionStageType: QuerySolutionStageType.STAGE_AND_SORTED,

  fullName: "Sorted AND",
  description:
    "The query planner selects a sorted index intersection to combine " +
    "results from multiple index scans. Advances through sorted streams " +
    "of RecordIds in lockstep to find matches.",
  category: StageCategory.Filter,
  iconName: "Filter",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Very memory-efficient — no buffering " +
    "required. Requires pre-sorted inputs (typically from index scans). " +
    "Performance depends on selectivity and number of children.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
