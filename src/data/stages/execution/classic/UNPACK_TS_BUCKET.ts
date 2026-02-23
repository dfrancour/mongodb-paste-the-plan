import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const UNPACK_TS_BUCKET: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("UNPACK_TS_BUCKET"),
  querySolutionStageType: QuerySolutionStageType.STAGE_UNPACK_SAMPLED_TS_BUCKET,

  fullName: "Unpack Time Series Bucket",
  description:
    "Unpacks compressed time-series bucket documents into individual measurements. " +
    "Materializes measurements one at a time from buckets fetched by child stage.",
  category: StageCategory.TimeSeries,
  iconName: "Clock",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Materializes individual measurements from time-series buckets. " +
    "Each bucket can contain hundreds or thousands of measurements depending on time window. " +
    "Iterates through all measurements within each bucket before moving to the next. " +
    "Present in every time-series query execution plan.",

  sourceFile: "src/mongo/db/exec/classic/unpack_timeseries_bucket.h",

  explainFields: [
    {
      bsonKey: "nBucketsUnpacked",
      description: "Number of buckets unpacked into measurements",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
  ],
} as const;
