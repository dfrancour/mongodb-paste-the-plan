import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const SAMPLE_FROM_TIMESERIES_BUCKET: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("SAMPLE_FROM_TIMESERIES_BUCKET"),
  querySolutionStageType:
    QuerySolutionStageType.STAGE_SAMPLE_FROM_TIMESERIES_BUCKET,

  fullName: "Sample from Time Series Bucket",
  description:
    "Randomly samples measurements from time-series buckets. " +
    "Selects one random measurement from each sampled bucket.",
  category: StageCategory.TimeSeries,
  iconName: "Clock",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Each bucket iteration produces one random measurement. " +
    "Deduplicates to avoid returning the same measurement twice. " +
    "More efficient than unpacking all measurements then sampling, as it samples at the bucket level first. " +
    "Introduced in MongoDB 5.0 for optimized $sample on time-series collections.",

  sourceFile: "src/mongo/db/exec/classic/sample_from_timeseries_bucket.h",
} as const;
