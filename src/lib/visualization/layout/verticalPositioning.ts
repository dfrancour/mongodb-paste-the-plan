import type { LayoutConfig } from "./config";

/**
 * Calculate Y positions for each level based on cumulative heights.
 * Level 0 (root) at top, deepest levels at bottom — data flows upward.
 */
export function calculateLevelYPositions(
  levels: Map<string, number>,
  stageHeights: Map<string, number>,
  config: LayoutConfig,
): Map<number, number> {
  const maxLevel = Math.max(...levels.values());
  const levelPositions = new Map<number, number>();

  for (let level = 0; level <= maxLevel; level++) {
    if (level === 0) {
      levelPositions.set(level, config.containerPadding);
    } else {
      const prevLevelPosition = levelPositions.get(level - 1) ?? 0;
      // Use at least config.nodeHeight so levels stay far enough apart
      // even when dynamic height estimates are smaller than rendered size
      const prevLevelMaxHeight = Math.max(
        ...Array.from(levels.entries())
          .filter(([_, stageLevel]) => stageLevel === level - 1)
          .map(([stageId, _]) =>
            Math.max(
              stageHeights.get(stageId) ?? config.nodeHeight,
              config.nodeHeight,
            ),
          ),
      );
      levelPositions.set(
        level,
        prevLevelPosition + prevLevelMaxHeight + config.verticalSpacing,
      );
    }
  }

  return levelPositions;
}
