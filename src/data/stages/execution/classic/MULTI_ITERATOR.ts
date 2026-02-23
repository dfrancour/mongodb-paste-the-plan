import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const MULTI_ITERATOR: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("MULTI_ITERATOR"),
  querySolutionStageType: QuerySolutionStageType.STAGE_MULTI_ITERATOR,

  fullName: "Multiple Iterators",
  description:
    "Manages multiple record store cursors for queries that need to scan the same " +
    "collection multiple times or with different strategies.",
  category: StageCategory.Internal,
  iconName: "Cog",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Coordinates multiple cursors over the same collection. " +
    "Used for complex queries requiring multiple scan strategies. " +
    "Memory overhead proportional to number of active cursors.",

  sourceFile: "src/mongo/db/exec/classic/multi_iterator.h",

  // Cursor coordinator — no stage-specific metrics beyond common fields
  explainFields: [],
} as const;
