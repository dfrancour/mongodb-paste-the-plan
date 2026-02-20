import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $graphLookup: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$graphLookup"),

  fullName: "Graph Lookup",
  description:
    "Performs recursive graph traversal for hierarchical data. " +
    "Useful for organizational charts, social networks, and parent-child relationships.",
  category: StageCategory.Join,
  iconName: "Link",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/graphLookup/",

  sourceFile: "src/mongo/db/pipeline/document_source_graph_lookup.h",
} as const;
