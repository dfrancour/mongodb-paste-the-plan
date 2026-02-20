import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $changeStream: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$changeStream"),

  fullName: "Change Stream",
  description:
    "Returns change stream cursor for real-time data changes. " +
    "Monitors insert, update, delete, and replace operations on collections.",
  category: StageCategory.SystemMetadata,
  iconName: "Activity",

  docsUrl: "https://www.mongodb.com/docs/manual/changeStreams/",

  sourceFile: "src/mongo/db/pipeline/document_source_change_stream.h",
} as const;
