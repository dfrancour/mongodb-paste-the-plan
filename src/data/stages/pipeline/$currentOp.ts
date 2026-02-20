import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $currentOp: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$currentOp"),

  fullName: "Current Operations",
  description:
    "Returns information about active operations on MongoDB instance. " +
    "Useful for monitoring and diagnosing performance issues.",
  category: StageCategory.SystemMetadata,
  iconName: "Activity",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/currentOp/",

  sourceFile: "src/mongo/db/pipeline/document_source_current_op.h",
} as const;
