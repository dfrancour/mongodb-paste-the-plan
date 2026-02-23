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

  explainFields: [
    {
      bsonKey: "opType",
      description: "Operation type (update or delete)",
      valueType: "string",
      verbosity: "queryPlanner",
    },
    {
      bsonKey: "bucketFilter",
      description: "Filter applied to time-series buckets",
      valueType: "object",
      verbosity: "queryPlanner",
    },
    {
      bsonKey: "residualFilter",
      description: "Filter applied to individual measurements",
      valueType: "object",
      verbosity: "queryPlanner",
    },
    {
      bsonKey: "nBucketsUnpacked",
      description: "Number of buckets unpacked",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
    // Update-only fields (undefined for deletes — simply not extracted)
    {
      bsonKey: "nMeasurementsMatched",
      description: "Measurements matching the update predicate",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
    {
      bsonKey: "nMeasurementsUpdated",
      description: "Measurements updated",
      valueType: "number",
      verbosity: "executionStats",
      cppName: "nMeasurementsModified",
      unit: "count",
    },
    {
      bsonKey: "nMeasurementsUpserted",
      description: "Measurements upserted",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
    // Delete-only field (undefined for updates — simply not extracted)
    {
      bsonKey: "nMeasurementsDeleted",
      description: "Measurements deleted",
      valueType: "number",
      verbosity: "executionStats",
      cppName: "nMeasurementsModified",
      unit: "count",
    },
  ],
} as const;
