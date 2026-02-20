import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const ixseek: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("ixseek"),
  querySolutionStageType: QuerySolutionStageType.STAGE_IXSCAN,

  fullName: "SBE Index Seek",
  description:
    "Index scan that performs point lookups (seeks) for specific keys rather than " +
    "range scans. Optimized for equality predicates.",
  category: StageCategory.IndexScan,
  iconName: "Search",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. More efficient than ixscan for point lookups. " +
    "Seeks directly to specific index keys without scanning ranges. " +
    "Ideal for equality predicates and IN queries with specific values.",

  sourceFile: "src/mongo/db/exec/sbe/stages/ix_scan.h",
} as const;
