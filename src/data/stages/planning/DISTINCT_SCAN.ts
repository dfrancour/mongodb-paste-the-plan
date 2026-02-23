import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";
import { INDEX_METADATA_FIELDS } from "../fields/index_metadata";

export const DISTINCT_SCAN: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("DISTINCT_SCAN"),
  querySolutionStageType: QuerySolutionStageType.STAGE_DISTINCT_SCAN,

  fullName: "Distinct Index Scan",
  description:
    "The query planner selects an optimized index scan for distinct operations. " +
    "Uses key-skipping behavior to jump over duplicate index keys efficiently.",
  category: StageCategory.IndexScan,
  iconName: "Search",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Much more efficient than full index " +
    "scan + deduplication. Performance improvement proportional to " +
    "the number of duplicates.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [
    ...INDEX_METADATA_FIELDS,
    {
      bsonKey: "direction",
      description: "Scan direction (forward or backward)",
      valueType: "string",
      verbosity: "queryPlanner",
    },
    {
      bsonKey: "indexBounds",
      description: "Key ranges scanned in each index field",
      valueType: "object",
      verbosity: "queryPlanner",
    },
  ],
} as const;
