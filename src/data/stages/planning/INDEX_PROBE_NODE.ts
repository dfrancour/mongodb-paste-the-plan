import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";
import { INDEX_METADATA_FIELDS } from "../fields/index_metadata";

export const INDEX_PROBE_NODE: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("INDEX_PROBE_NODE"),
  querySolutionStageType: QuerySolutionStageType.STAGE_INDEX_PROBE_NODE,

  fullName: "Index Probe",
  description:
    "Probes an index to retrieve candidate documents for vector search. " +
    "Used as the inner side of embedding join nodes to efficiently locate " +
    "documents by indexed embedding vectors.",
  category: StageCategory.IndexScan,
  iconName: "Search",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Performance depends on index efficiency " +
    "and the number of probes required by the parent join node.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [...INDEX_METADATA_FIELDS],
} as const;
