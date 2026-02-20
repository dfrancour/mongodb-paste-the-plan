import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const AND_HASH: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("AND_HASH"),
  querySolutionStageType: QuerySolutionStageType.STAGE_AND_HASH,

  fullName: "Hash-Based AND",
  description:
    "The query planner selects a hash-based index intersection to combine " +
    "results from multiple index scans. Builds a hash table from the first " +
    "child and probes it with remaining children.",
  category: StageCategory.Filter,
  iconName: "Filter",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage but requires buffering first child " +
    "in memory. Uses hash table (32MB default limit) to intersect RecordIds. " +
    "Efficient for moderate result sets with good RecordId distribution.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
