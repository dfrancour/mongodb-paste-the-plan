import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const IXSCAN: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("IXSCAN"),
  querySolutionStageType: QuerySolutionStageType.STAGE_IXSCAN,

  fullName: "Index Scan",
  description:
    "The query planner selects an index scan to find matching documents. " +
    "Traverses the chosen index from startKey to endKey, applying any " +
    "index-level filters.",
  category: StageCategory.IndexScan,
  iconName: "Search",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Efficiency depends on index selectivity " +
    "and the number of keys examined. Deduplicates on RecordId for " +
    "multikey indexes.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
