import type { PipelineStage } from "../types";
import { StageCategory, StageIds } from "../types";

export const $vectorSearch: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$vectorSearch"),

  fullName: "Vector Search",
  description:
    "Performs vector similarity search on vector embeddings for AI/ML applications. " +
    "Finds semantically similar documents using vector indexes.",
  category: StageCategory.VectorSearch,
  iconName: "ArrowUpFromDot",

  docsUrl:
    "https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/",

  sourceFile: "src/mongo/db/pipeline/search/document_source_vector_search.h",
} as const;
