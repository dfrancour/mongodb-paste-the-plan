import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $listLocalSessions: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$listLocalSessions"),

  fullName: "List Local Sessions",
  description:
    "Lists active sessions on current server only. " +
    "Returns session information including users, connection details, and activity.",
  category: StageCategory.SystemMetadata,
  iconName: "List",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/listLocalSessions/",

  sourceFile: "src/mongo/db/pipeline/document_source_list_local_sessions.h",
} as const;
