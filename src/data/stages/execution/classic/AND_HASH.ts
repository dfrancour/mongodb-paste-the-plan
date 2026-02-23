import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";
import { perChildFields } from "../../fields/field_utilities";

export const AND_HASH: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("AND_HASH"),
  querySolutionStageType: QuerySolutionStageType.STAGE_AND_HASH,

  fullName: "Hash-Based AND",
  description:
    "Intersects results from N children using a hash table based on RecordId. " +
    "Builds hash table from first child, then probes with remaining children.",
  category: StageCategory.Filter,
  iconName: "Filter",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage but requires buffering first child in memory. " +
    "Uses hash table (32MB default limit) to intersect RecordIds from multiple children. " +
    "Memory usage tracked but no disk spilling - fails if limit exceeded. " +
    "Efficient for moderate result sets with good RecordId distribution.",

  sourceFile: "src/mongo/db/exec/classic/and_hash.h",

  explainFields: [
    {
      bsonKey: "memUsage",
      description: "Current hash table memory usage",
      valueType: "number",
      verbosity: "executionStats",
      unit: "bytes",
    },
    {
      bsonKey: "memLimit",
      description: "Maximum hash table memory allowed",
      valueType: "number",
      verbosity: "executionStats",
      unit: "bytes",
    },
    // One mapAfterChild_N per child — undefined indices are simply not extracted.
    ...perChildFields(
      "mapAfterChild_",
      "Hash table entries after processing child",
      4,
    ),
  ],
} as const;
