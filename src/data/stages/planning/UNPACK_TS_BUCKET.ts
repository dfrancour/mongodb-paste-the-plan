import type { PlanningStage } from "../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../types";

export const UNPACK_TS_BUCKET: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("UNPACK_TS_BUCKET"),
  querySolutionStageType: QuerySolutionStageType.STAGE_UNPACK_TS_BUCKET,

  fullName: "Unpack Time-Series Bucket",
  description:
    "The query planner adds an unpack stage to materialize individual " +
    "measurements from compressed time-series bucket documents. Present " +
    "in every time-series query plan.",
  category: StageCategory.TimeSeries,
  iconName: "Clock",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Each bucket can contain hundreds or " +
    "thousands of measurements. Iterates through all measurements within " +
    "each bucket before moving to the next.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",
} as const;
