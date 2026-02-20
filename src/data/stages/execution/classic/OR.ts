import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const OR: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("OR"),
  querySolutionStageType: QuerySolutionStageType.STAGE_OR,

  fullName: "OR Combiner",
  description:
    "Combines results from multiple child stages representing OR conditions. " +
    "Deduplicates results based on RecordId.",
  category: StageCategory.Filter,
  iconName: "Filter",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Buffers RecordIds to deduplicate results. " +
    "Memory usage proportional to result set size. " +
    "Evaluates children and merges results, removing duplicates.",

  sourceFile: "src/mongo/db/exec/classic/or.h",
} as const;
