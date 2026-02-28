import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const SORT: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("SORT"),
  querySolutionStageType: QuerySolutionStageType.STAGE_SORT_DEFAULT,

  fullName: "Sort",
  description:
    "The query planner adds an in-memory sort when no index supports " +
    "the requested sort order. Both STAGE_SORT_DEFAULT and STAGE_SORT_SIMPLE " +
    "appear as SORT in explain output.",
  category: StageCategory.Sort,
  iconName: "SortAsc",

  builtFromUserSyntax: [StageIds.pipeline("$sort")],

  blockingStage: true,
  canSpillToDisk: true,

  performanceNotes:
    "Blocking stage — must consume all input before producing output. " +
    "Can spill to disk when memory limit exceeded (default 100MB). " +
    "Consider adding an index to avoid in-memory sorting.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [
    {
      bsonKey: "sortPattern",
      description: "Sort key specification",
      valueType: "object",
      verbosity: "queryPlanner",
    },
    {
      bsonKey: "memLimit",
      description: "Memory limit for in-memory sort",
      valueType: "number",
      verbosity: "queryPlanner",
      cppName: "maxMemoryUsageBytes",
      unit: "bytes",
    },
    {
      bsonKey: "limitAmount",
      description: "Maximum number of results to sort",
      valueType: "number",
      verbosity: "queryPlanner",
      cppName: "limit",
      unit: "count",
    },
    {
      bsonKey: "type",
      description: "Sort algorithm used (simple or default)",
      valueType: "string",
      verbosity: "queryPlanner",
    },
  ],
} as const;
