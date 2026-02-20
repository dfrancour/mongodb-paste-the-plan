import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const COLLSCAN: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("COLLSCAN"),
  querySolutionStageType: QuerySolutionStageType.STAGE_COLLSCAN,

  fullName: "Collection Scan",
  description:
    "The query planner selects a full collection scan, reading every document " +
    "sequentially without using an index. Indicates no suitable index exists " +
    "for the query predicates.",
  category: StageCategory.CollectionScan,
  iconName: "FolderSearch",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Can be slow for large collections. " +
    "Generally indicates a missing index — consider adding an index " +
    "if this appears in slow queries.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
