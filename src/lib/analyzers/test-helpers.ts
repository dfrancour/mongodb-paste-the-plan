import type { NormalizedExecutionStage } from "#types/explain-plan";
import { StageCategory } from "#data/stages/types";

export function createMockNormalizedStage(
  overrides: Partial<NormalizedExecutionStage> = {},
): NormalizedExecutionStage {
  return {
    id: "stage-1",
    stage: "TEST_STAGE",
    category: StageCategory.Internal,
    iconName: "CircleQuestionMark",
    structure: {},
    metrics: {},
    children: [],
    depth: 0,
    ...overrides,
  };
}
