import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const IXSCAN: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("IXSCAN"),
  querySolutionStageType: QuerySolutionStageType.STAGE_IXSCAN,

  fullName: "Index Scan",
  description:
    "Scans index keys to find matching documents. " +
    "Traverses index from startKey to endKey, optionally applying filters.",
  category: StageCategory.IndexScan,
  iconName: "Search",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Scans index in order (forward or backward). " +
    "Deduplicates on RecordId for multikey indexes. " +
    "Can apply filter expressions over index fields during scan. " +
    "Efficient when index selectivity is high.",

  sourceFile: "src/mongo/db/exec/classic/index_scan.h",
} as const;
