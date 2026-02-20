import type { ExecutionStage } from "../../types";
import { StageCategory, StageIds } from "../../types";

export const branch: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("branch"),

  fullName: "SBE Branch",
  description:
    "Conditional execution stage that evaluates a filter expression and executes " +
    "either the 'then' branch or 'else' branch based on the result.",
  category: StageCategory.Internal,
  iconName: "GitBranch",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes:
    "Non-blocking control flow stage. The filter expression is evaluated once at the start. " +
    "Only the selected branch (then or else) is executed - the other branch is never opened. " +
    "Useful for conditional query execution that avoids evaluating unnecessary paths.",

  sourceFile: "src/mongo/db/exec/sbe/stages/branch.h",
} as const;
