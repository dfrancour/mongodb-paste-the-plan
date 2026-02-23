import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const ixscan_generic: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("ixscan_generic"),
  querySolutionStageType: QuerySolutionStageType.STAGE_IXSCAN,

  fullName: "SBE Generic Index Scan",
  description:
    "Generic index scan supporting complex index bounds. Similar to ixscan but handles " +
    "more complex bound specifications and multi-interval scans.",
  category: StageCategory.IndexScan,
  iconName: "Search",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Returns documents from index in index order. " +
    "Supports complex bounds and multi-interval scans. " +
    "Can extract index key values into separate slots for covered queries.",

  sourceFile: "src/mongo/db/exec/sbe/stages/generic_scan.h",

  // Generic variant of ixscan — see ixscan for field declarations
  explainFields: [],
} as const;
