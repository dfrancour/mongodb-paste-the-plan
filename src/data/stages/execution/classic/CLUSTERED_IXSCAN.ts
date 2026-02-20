import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const CLUSTERED_IXSCAN: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("CLUSTERED_IXSCAN"),
  querySolutionStageType: QuerySolutionStageType.STAGE_COLLSCAN,

  fullName: "Clustered Index Scan",
  description:
    "Scans a clustered collection where data is physically stored in clustered index order. " +
    "Used for collections with a clustered index on _id.",
  category: StageCategory.IndexScan,
  iconName: "Search",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. For clustered collections, data is stored in index order. " +
    "Eliminates need for separate index lookup and fetch stages - data is accessed directly. " +
    "More efficient than IXSCAN + FETCH combination for clustered collections. " +
    "Clustered collections introduced in MongoDB 5.3 optimize _id-based access patterns. " +
    "Supports bounded and unbounded scans over the clustered index.",

  sourceFile: "src/mongo/db/exec/classic/collection_scan.h",
} as const;
