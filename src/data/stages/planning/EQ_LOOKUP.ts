import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const EQ_LOOKUP: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("EQ_LOOKUP"),
  querySolutionStageType: QuerySolutionStageType.STAGE_EQ_LOOKUP,

  fullName: "Equality Lookup",
  description:
    "The query planner pushes a $lookup with an equality condition into the execution engine. " +
    "Joins documents from a foreign collection based on matching field values.",
  category: StageCategory.Join,
  iconName: "Link",

  builtFromUserSyntax: [StageIds.pipeline("$lookup")],

  blockingStage: true,
  canSpillToDisk: true,

  performanceNotes:
    "Blocking on the inner (foreign) side — builds a hash table from the foreign collection " +
    "before streaming the outer side. Can spill to disk when the hash table exceeds memory limits. " +
    "Performance depends on the size of the foreign collection and selectivity of the join key.",

  analysisNote:
    "Join operation — can be expensive for large foreign collections",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
