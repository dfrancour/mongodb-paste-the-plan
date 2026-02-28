import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const SORT_MERGE: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("SORT_MERGE"),
  querySolutionStageType: QuerySolutionStageType.STAGE_SORT_MERGE,

  fullName: "Sort Merge",
  description:
    "Merges multiple pre-sorted input streams into a single sorted output stream. " +
    "Assumes all inputs are already sorted in the same order.",
  category: StageCategory.Join,
  iconName: "Link",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Efficiently merges pre-sorted streams. " +
    "Uses priority queue to select next document from sorted inputs. " +
    "No sorting or buffering required - just merging. " +
    "Common when combining results from multiple index scans.",

  sourceFile: "src/mongo/db/exec/classic/merge_sort.h",

  explainFields: [
    {
      bsonKey: "sortPattern",
      description: "Sort key specification for merge order",
      valueType: "object",
      verbosity: "queryPlanner",
    },
    {
      bsonKey: "dupsTested",
      description: "Number of keys tested for duplicates",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
    {
      bsonKey: "dupsDropped",
      description: "Number of duplicate keys dropped",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
  ],
} as const;
