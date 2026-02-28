import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const GROUP: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("GROUP"),
  querySolutionStageType: QuerySolutionStageType.STAGE_GROUP,

  fullName: "Group",
  description:
    "The query planner pushes a $group aggregation into the execution engine. " +
    "Groups documents by specified keys and computes aggregate values.",
  category: StageCategory.Aggregation,
  iconName: "Group",

  builtFromUserSyntax: [StageIds.pipeline("$group")],

  blockingStage: true,
  canSpillToDisk: true,

  performanceNotes:
    "Blocking stage — must consume all input before producing output. " +
    "Memory usage grows with the number of distinct grouping keys. " +
    "Can spill to disk when memory limit is exceeded (default 100MB).",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [],
} as const;
