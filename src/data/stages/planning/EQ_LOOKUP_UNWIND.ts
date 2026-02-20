import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const EQ_LOOKUP_UNWIND: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("EQ_LOOKUP_UNWIND"),
  querySolutionStageType: QuerySolutionStageType.STAGE_EQ_LOOKUP_UNWIND,

  fullName: "Equality Lookup with Unwind",
  description:
    "The query planner fuses a $lookup immediately followed by $unwind on the joined field " +
    "into a single plan node. Produces one output document per matched foreign document " +
    "instead of creating an intermediate array.",
  category: StageCategory.Join,
  iconName: "Link",

  builtFromUserSyntax: [StageIds.pipeline("$lookup")],

  blockingStage: true,
  canSpillToDisk: false,

  performanceNotes:
    "Blocking on the inner (foreign) side. More efficient than separate EQ_LOOKUP + UNWIND " +
    "because it avoids materializing intermediate arrays.",

  analysisNote:
    "Join operation — can be expensive for large foreign collections",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
