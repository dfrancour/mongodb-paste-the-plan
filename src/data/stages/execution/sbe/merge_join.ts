import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const merge_join: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("merge_join"),
  querySolutionStageType: QuerySolutionStageType.STAGE_SORT_MERGE,

  fullName: "SBE Merge Join",
  description:
    "Merge join for sorted inputs. Equi-join that requires both sides sorted by join keys. " +
    "Buffers outer rows to support full cross product for matching keys.",
  category: StageCategory.Join,
  iconName: "Link",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking but buffers groups of matching outer rows temporarily. " +
    "O(N + M) complexity when inputs are sorted, making it efficient for pre-sorted data. " +
    "Works well when an index provides the required sort order for both sides.",

  sourceFile: "src/mongo/db/exec/sbe/stages/merge_join.h",
} as const;
