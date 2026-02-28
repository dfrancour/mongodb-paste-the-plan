import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const SORT_MERGE: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("SORT_MERGE"),
  querySolutionStageType: QuerySolutionStageType.STAGE_SORT_MERGE,

  fullName: "Sort Merge",
  description:
    "The query planner merges multiple pre-sorted input streams into " +
    "a single sorted output stream. Common when combining results from " +
    "multiple index scans that share a sort order.",
  category: StageCategory.Join,
  iconName: "Link",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Uses a priority queue to select " +
    "the next document from sorted inputs. No sorting or buffering " +
    "required — just merging.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [
    {
      bsonKey: "sortPattern",
      description: "Sort key specification for merge ordering",
      valueType: "object",
      verbosity: "queryPlanner",
    },
  ],
} as const;
