import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";
import { INDEX_METADATA_FIELDS } from "../fields/index_metadata";

export const COUNT_SCAN: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("COUNT_SCAN"),
  querySolutionStageType: QuerySolutionStageType.STAGE_COUNT_SCAN,

  fullName: "Count Index Scan",
  description:
    "The query planner selects an optimized index scan for count operations. " +
    "Counts index entries directly without full key examination, using " +
    "index bounds to count documents within a range.",
  category: StageCategory.Aggregation,
  iconName: "Calculator",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Can skip key deserialization when " +
    "only the count is needed. Generally faster than scanning documents " +
    "when an appropriate index exists.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [
    ...INDEX_METADATA_FIELDS,
    {
      bsonKey: "indexBounds",
      description: "Start/end key bounds for the count scan",
      valueType: "object",
      verbosity: "queryPlanner",
    },
  ],
} as const;
