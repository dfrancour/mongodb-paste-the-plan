import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const IDHACK: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("IDHACK"),
  querySolutionStageType: QuerySolutionStageType.STAGE_IDHACK,

  fullName: "ID Hack",
  description:
    "The query planner selects an optimized fast path for single-document " +
    "lookup by _id. Bypasses normal query planning for _id equality queries.",
  category: StageCategory.IndexScan,
  iconName: "Search",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Returns at most one document. " +
    "Direct index lookup without bounds checking. Only used when " +
    "query collation matches collection default collation.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
