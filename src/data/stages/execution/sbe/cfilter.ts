import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const cfilter: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("cfilter"),
  querySolutionStageType: QuerySolutionStageType.STAGE_MATCH,

  fullName: "SBE Constant Filter",
  description:
    "Constant filter variant where the predicate does not depend on input values. " +
    "Evaluates the predicate once at the start. If false, immediately returns no results.",
  category: StageCategory.Filter,
  iconName: "Filter",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Optimized variant for predicates known before execution begins. " +
    "The filter is evaluated once at the start rather than per document.",

  sourceFile: "src/mongo/db/exec/sbe/stages/filter.h",

  // Predicate evaluated once at start — no per-document metrics beyond SBE common fields
  explainFields: [],
} as const;
