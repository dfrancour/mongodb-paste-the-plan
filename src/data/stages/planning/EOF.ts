import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const EOF: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("EOF"),
  querySolutionStageType: QuerySolutionStageType.STAGE_EOF,

  fullName: "End of Stream",
  description:
    "The query planner produces an empty result set. Immediately returns " +
    "EOF without producing any results. Used as a placeholder in query " +
    "plans or to represent provably empty result sets.",
  category: StageCategory.Internal,
  iconName: "CircleOff",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking marker stage. No actual work performed — immediately " +
    "signals EOF. Minimal overhead.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
