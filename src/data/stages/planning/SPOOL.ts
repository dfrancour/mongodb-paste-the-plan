import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const SPOOL: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("SPOOL"),
  querySolutionStageType: QuerySolutionStageType.STAGE_SPOOL,

  fullName: "Spool Buffer",
  description:
    "The query planner adds a spool to eagerly buffer all input for " +
    "later reuse. Caches RecordIds in memory or on disk for operations " +
    "requiring multiple passes over the same data.",
  category: StageCategory.Internal,
  iconName: "Database",

  blockingStage: true,
  canSpillToDisk: true,

  performanceNotes:
    "Blocking stage — must consume all input before producing output. " +
    "Can spill to disk. Only caches references (not full documents) " +
    "to reduce memory and disk usage.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
