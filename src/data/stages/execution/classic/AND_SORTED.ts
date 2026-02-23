import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";
import { perChildFields } from "../../fields/field_utilities";

export const AND_SORTED: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("AND_SORTED"),
  querySolutionStageType: QuerySolutionStageType.STAGE_AND_SORTED,

  fullName: "Sorted AND",
  description:
    "Intersects sorted result sets by advancing through sorted streams of RecordIds. " +
    "Assumes each child produces RecordIds in sorted order.",
  category: StageCategory.Filter,
  iconName: "Filter",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Advances children in lockstep to find matching RecordIds. " +
    "Very memory-efficient - no buffering required. " +
    "Requires pre-sorted inputs (typically from index scans). " +
    "Performance depends on selectivity and number of children.",

  sourceFile: "src/mongo/db/exec/classic/and_sorted.h",

  explainFields: [
    // One failedAnd_N per child — undefined indices are simply not extracted.
    ...perChildFields(
      "failedAnd_",
      "Failed intersection attempts for child",
      4,
    ),
  ],
} as const;
