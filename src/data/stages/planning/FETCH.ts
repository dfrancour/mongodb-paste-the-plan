import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const FETCH: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("FETCH"),
  querySolutionStageType: QuerySolutionStageType.STAGE_FETCH,

  fullName: "Fetch Documents",
  description:
    "The query planner adds a fetch stage to retrieve full documents " +
    "from the collection using RecordIds produced by a child index scan. " +
    "May apply residual filter predicates after fetching.",
  category: StageCategory.Fetch,
  iconName: "FileSearch",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Fetches one document per RecordId. " +
    "Performance depends on document locality on disk and filter selectivity.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [],
} as const;
