import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const COLLSCAN: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("COLLSCAN"),
  querySolutionStageType: QuerySolutionStageType.STAGE_COLLSCAN,

  fullName: "Collection Scan",
  description:
    "Scans all documents in the collection sequentially without using an index. " +
    "Reads every document from the collection in natural order.",
  category: StageCategory.CollectionScan,
  iconName: "FolderSearch",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Can be slow for large collections. " +
    "Generally indicates missing index - consider adding an index if this appears in slow queries.",

  analysisNote: "Collection scan - consider adding an index on filtered fields",

  sourceFile: "src/mongo/db/exec/classic/collection_scan.h",
} as const;
