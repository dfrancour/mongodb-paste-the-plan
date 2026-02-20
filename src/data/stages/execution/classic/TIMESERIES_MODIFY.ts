import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const TIMESERIES_MODIFY: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("TIMESERIES_MODIFY"),
  querySolutionStageType: QuerySolutionStageType.STAGE_TIMESERIES_MODIFY,

  fullName: "Time Series Modification",
  description:
    "Handles update and delete operations on time-series collections. " +
    "Modifies bucket documents by updating or removing measurements within buckets.",
  category: StageCategory.Writes,
  iconName: "Edit",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking write stage for time-series collections. " +
    "Supports both update and delete operations on measurements within buckets. " +
    "Unpacks buckets, applies modifications to matching measurements, then repacks buckets. " +
    "Handles bucket splitting when modifications cause bucket size to exceed limits. " +
    "More complex than regular document updates due to bucket-based storage model. " +
    "Introduced in MongoDB 5.0 when time-series updates/deletes were added.",

  sourceFile: "src/mongo/db/exec/classic/timeseries_modify.h",
} as const;
