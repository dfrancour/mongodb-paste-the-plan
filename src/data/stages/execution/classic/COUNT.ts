import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const COUNT: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("COUNT"),
  querySolutionStageType: QuerySolutionStageType.STAGE_COUNT,

  fullName: "Count Documents",
  description:
    "Counts the number of documents returned by its child stage, applying optional skip and limit. " +
    "Sits at the root of count operation plans.",
  category: StageCategory.Aggregation,
  iconName: "Calculator",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Returns NEED_TIME until child hits EOF. " +
    "Does not buffer documents - just maintains a counter. " +
    "Very lightweight. Note: different from COUNT_SCAN which is an index access optimization.",

  sourceFile: "src/mongo/db/exec/classic/count.h",
} as const;
