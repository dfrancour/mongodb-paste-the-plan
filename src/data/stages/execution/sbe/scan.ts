import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const scan: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("scan"),
  querySolutionStageType: QuerySolutionStageType.STAGE_COLLSCAN,

  fullName: "SBE Collection Scan",
  description:
    "Retrieves documents from a collection using the storage API. " +
    "Can extract top-level fields from documents and supports forward/backward scanning.",
  category: StageCategory.CollectionScan,
  iconName: "FolderSearch",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Reads documents sequentially from the collection. " +
    "Performance depends on collection size and whether an index could be used instead. " +
    "Generally indicates missing index if this appears in queries with selective predicates.",

  analysisNote: "Collection scan - consider adding an index on filtered fields",

  sourceFile: "src/mongo/db/exec/sbe/stages/scan.h",
} as const;
