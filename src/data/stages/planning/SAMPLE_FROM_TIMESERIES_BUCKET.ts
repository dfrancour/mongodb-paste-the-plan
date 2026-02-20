import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const SAMPLE_FROM_TIMESERIES_BUCKET: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("SAMPLE_FROM_TIMESERIES_BUCKET"),
  querySolutionStageType:
    QuerySolutionStageType.STAGE_SAMPLE_FROM_TIMESERIES_BUCKET,

  fullName: "Sample from Time-Series Bucket",
  description:
    "The query planner selects a time-series bucket sampling strategy. " +
    "Randomly samples measurements from time-series buckets, selecting " +
    "one random measurement from each sampled bucket.",
  category: StageCategory.TimeSeries,
  iconName: "Clock",

  builtFromUserSyntax: [StageIds.pipeline("$sample")],

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. More efficient than unpacking all " +
    "measurements then sampling, as it samples at the bucket level first.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
