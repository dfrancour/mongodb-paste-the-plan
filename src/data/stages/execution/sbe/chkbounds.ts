import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds } from "../../types";

export const chkbounds: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("chkbounds"),

  fullName: "SBE Check Bounds",
  description:
    "Validated index bounds during index scans. " +
    "Removed in MongoDB 7.0 (SERVER-68102) - functionality merged into ixscan stage.",
  category: StageCategory.IndexScan,
  iconName: "Search",

  blockingStage: false,
  canSpillToDisk: false,

  removedIn: "7.0",

  performanceNotes:
    "Non-blocking streaming stage. Ensured index scan stayed within specified bounds.",

  sourceFile: "src/mongo/db/exec/sbe/stages/check_bounds.h",

  // Source: sbe::CheckBoundsStats (sbe/stages/plan_stats.h:234)
  explainFields: [
    {
      bsonKey: "seeks",
      description: "Index seeks for bounds checking",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
  ],
} as const;
