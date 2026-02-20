import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const FETCH: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("FETCH"),
  querySolutionStageType: QuerySolutionStageType.STAGE_FETCH,

  fullName: "Fetch Documents",
  description:
    "Retrieves full documents from the collection using RecordIds from an index scan.",
  category: StageCategory.Fetch,
  iconName: "FileSearch",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Fetches one document per RecordId from child stage. " +
    "Can apply filter expressions after fetching full document. " +
    "Performance depends on document locality on disk and filter selectivity.",

  sourceFile: "src/mongo/db/exec/classic/fetch.h",
} as const;
