import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $listSessions: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$listSessions"),

  fullName: "List Sessions",
  description:
    "Lists all active sessions across entire cluster. " +
    "Returns session information for all connected clients.",
  category: StageCategory.SystemMetadata,
  iconName: "List",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/listSessions/",

  sourceFile: "src/mongo/db/pipeline/document_source_list_sessions.h",
} as const;
