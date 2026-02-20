import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const CLUSTERED_IXSCAN: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("CLUSTERED_IXSCAN"),
  querySolutionStageType: QuerySolutionStageType.STAGE_COLLSCAN,

  fullName: "Clustered Index Scan",
  description:
    "The query planner selects a scan of a clustered collection where data " +
    "is physically stored in clustered index order. Eliminates the need for " +
    "a separate fetch stage since documents are accessed directly.",
  category: StageCategory.IndexScan,
  iconName: "Search",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. More efficient than IXSCAN + FETCH " +
    "for clustered collections since data is stored in index order. " +
    "Supports bounded and unbounded scans over the clustered index.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
