import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds, QuerySolutionStageType } from "../../types";

export const EOF: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("EOF"),
  querySolutionStageType: QuerySolutionStageType.STAGE_EOF,

  fullName: "End of Stream",
  description:
    "Marker stage indicating end of result stream. Immediately returns EOF " +
    "without producing any results.",
  category: StageCategory.Internal,
  iconName: "CircleOff",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking marker stage. No actual work performed - immediately signals EOF. " +
    "Used as placeholder in query plans or to represent empty result sets. " +
    "Minimal overhead.",

  sourceFile: "src/mongo/db/exec/classic/eof.h",
} as const;
