import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const efilter: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("efilter"),
  querySolutionStageType: QuerySolutionStageType.STAGE_MATCH,

  fullName: "SBE Early-Exit Filter",
  description:
    "Early-exit filter variant that stops processing when the predicate evaluates to false. " +
    "Unlike regular filter which skips non-matching rows, efilter terminates the scan entirely.",
  category: StageCategory.Filter,
  iconName: "Filter",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Optimized for predicates where the first false result " +
    "means no more matches are possible (e.g., sorted data with range predicates). " +
    "Returns EOF immediately when predicate fails, rather than continuing to scan.",

  sourceFile: "src/mongo/db/exec/sbe/stages/filter.h",
} as const;
