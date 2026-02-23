import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const SEARCH: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("SEARCH"),
  querySolutionStageType: QuerySolutionStageType.STAGE_SEARCH,

  fullName: "Search",
  description:
    "The query planner delegates a $search query to the mongot (Atlas Search) service. " +
    "Retrieves search results from the remote service and outputs documents with search metadata.",
  category: StageCategory.TextSearch,
  iconName: "BookA",

  builtFromUserSyntax: [StageIds.pipeline("$search")],

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Performance depends on network latency to the mongot service " +
    "and the complexity of the search query. Supports stored source optimization to avoid " +
    "additional collection lookups.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [
    {
      bsonKey: "searchQuery",
      description: "Atlas Search query specification sent to mongot",
      valueType: "object",
      verbosity: "queryPlanner",
    },
    {
      bsonKey: "isSearchMeta",
      description: "Whether this is a $searchMeta (metadata-only) query",
      valueType: "boolean",
      verbosity: "queryPlanner",
    },
  ],
} as const;
