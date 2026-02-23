import type { NormalizedStage } from "#types/explain-plan";

/**
 * Calculate the level (depth from root) for each stage.
 * Siblings (children of the same parent) will be at the same level.
 */
export function calculateLevels(stage: NormalizedStage): Map<string, number> {
  const levels = new Map<string, number>();

  const calculateLevel = (
    currentStage: NormalizedStage,
    depth: number,
  ): void => {
    levels.set(currentStage.id, depth);

    currentStage.children.forEach((child) => {
      calculateLevel(child, depth + 1);
    });
  };

  calculateLevel(stage, 0);
  return levels;
}

/**
 * Group stages by their level
 */
export function groupByLevel(
  stage: NormalizedStage,
  levels: Map<string, number>,
): Map<number, NormalizedStage[]> {
  const groups = new Map<number, NormalizedStage[]>();

  const traverse = (currentStage: NormalizedStage) => {
    const level = levels.get(currentStage.id) ?? 0;

    if (!groups.has(level)) {
      groups.set(level, []);
    }
    groups.get(level)!.push(currentStage);

    currentStage.children.forEach((child) => traverse(child));
  };

  traverse(stage);
  return groups;
}
