import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const filter: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("filter"),
  querySolutionStageType: QuerySolutionStageType.STAGE_MATCH,

  fullName: "SBE Filter",
  description:
    "Standard filter stage that evaluates predicates on each input row. " +
    "Passes through rows where the predicate evaluates to true.",
  category: StageCategory.Filter,
  iconName: "Filter",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Evaluates predicate expression for each row. " +
    "Efficient for selective predicates. See also cfilter (constant predicates) and efilter (early-exit).",

  sourceFile: "src/mongo/db/exec/sbe/stages/filter.h",

  explainFields: [
    {
      bsonKey: "numTested",
      description: "Number of rows evaluated against the predicate",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
  ],
} as const;
