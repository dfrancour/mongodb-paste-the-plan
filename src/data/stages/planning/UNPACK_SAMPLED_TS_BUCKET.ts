import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const UNPACK_SAMPLED_TS_BUCKET: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("UNPACK_SAMPLED_TS_BUCKET"),
  querySolutionStageType: QuerySolutionStageType.STAGE_UNPACK_SAMPLED_TS_BUCKET,

  fullName: "Unpack Sampled Time-Series Bucket",
  description:
    "Unpacks documents from a time-series bucket during a $sample operation. " +
    "Used when sampling from a time-series collection — randomly selects " +
    "measurements from within time-series buckets.",
  category: StageCategory.TimeSeries,
  iconName: "Clock",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Specialized stage for $sample on time-series collections. " +
    "Extracts individual measurements from randomly selected bucket documents.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  explainFields: [],
} as const;
