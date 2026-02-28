import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const nlj: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("nlj"),
  querySolutionStageType:
    QuerySolutionStageType.STAGE_NESTED_LOOP_JOIN_EMBEDDING_NODE,

  fullName: "SBE Nested Loop Join",
  description:
    "Traditional nested loop join. For each outer row, re-opens and scans the entire inner side. " +
    "Supports optional join predicate, otherwise produces Cartesian product.",
  category: StageCategory.Join,
  iconName: "Link",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage but can be expensive for large datasets. " +
    "Re-scans inner side for every outer row, resulting in O(N*M) complexity. " +
    "Hash join or merge join are typically more efficient for large datasets. " +
    "Useful for correlated subqueries where the inner side depends on outer values.",

  sourceFile: "src/mongo/db/exec/sbe/stages/loop_join.h",

  explainFields: [
    {
      bsonKey: "innerOpens",
      description: "Times the inner side was opened",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
    {
      bsonKey: "innerCloses",
      description: "Times the inner side was closed",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
  ],
} as const;
