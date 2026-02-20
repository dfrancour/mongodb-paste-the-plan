import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const smerge: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("smerge"),
  querySolutionStageType: QuerySolutionStageType.STAGE_SORT_MERGE,

  fullName: "SBE Sorted Merge",
  description:
    "Merges outputs from multiple sorted child stages into a single sorted output stream. " +
    "Each child must produce results in sorted order.",
  category: StageCategory.Join,
  iconName: "Link",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Selects the next value from whichever child has the smallest key. " +
    "Assumes all inputs are already sorted - does not sort inputs itself. " +
    "Commonly used when merging results from multiple index scans.",

  sourceFile: "src/mongo/db/exec/sbe/stages/sorted_merge.h",
} as const;
