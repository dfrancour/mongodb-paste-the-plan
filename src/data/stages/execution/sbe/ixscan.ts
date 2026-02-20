import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const ixscan: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("ixscan"),
  querySolutionStageType: QuerySolutionStageType.STAGE_IXSCAN,

  fullName: "SBE Index Scan",
  description:
    "Scans an index in the slot-based execution engine. " +
    "Projects values from the index key and returns RecordIds for fetching documents.",
  category: StageCategory.IndexScan,
  iconName: "Search",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Scans index entries in order. " +
    "Supports both forward and backward scans. Generally faster than collection scans for selective queries. " +
    "Often followed by a fetch stage if non-indexed fields are needed.",

  sourceFile: "src/mongo/db/exec/sbe/stages/ix_scan.h",
} as const;
