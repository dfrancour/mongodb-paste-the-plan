import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const SORT_KEY_GENERATOR: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("SORT_KEY_GENERATOR"),
  querySolutionStageType: QuerySolutionStageType.STAGE_SORT_KEY_GENERATOR,

  fullName: "Sort Key Generator",
  description:
    "Extracts and generates sort keys from documents for sorting operations. " +
    "Prepares documents for downstream SORT stages by computing comparable keys.",
  category: StageCategory.Sort,
  iconName: "SortAsc",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Extracts sort keys from documents as they flow through. " +
    "Handles complex sort key extraction including dotted paths, arrays, and missing fields. " +
    "Applies collation rules when extracting string sort keys.",

  sourceFile: "src/mongo/db/exec/classic/sort_key_generator.h",
} as const;
