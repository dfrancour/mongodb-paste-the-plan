import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds } from "../../types";

export const agg_project: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("agg_project"),

  fullName: "SBE Aggregation Project",
  description:
    "Evaluates accumulator expressions in aggregate context. Similar to project " +
    "but maintains state across evaluations for accumulators.",
  category: StageCategory.Transformation,
  iconName: "Layers",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking streaming stage. Evaluates stateful accumulator expressions per row. " +
    "Unlike regular project (stateless), this maintains accumulator state. " +
    "Each accumulator has init and aggregate expressions. " +
    "Used for aggregation operations that can be computed row-by-row.",

  sourceFile: "src/mongo/db/exec/sbe/stages/agg_project.h",
} as const;
