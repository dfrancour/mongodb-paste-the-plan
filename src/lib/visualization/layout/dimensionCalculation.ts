import type { FlowPosition } from "#types/flow-visualization";
import type { LayoutConfig } from "./config";

/**
 * Calculate overall dimensions of the layout with dynamic heights.
 * Accepts pre-computed stageHeights so the bounding box uses the exact
 * heights used during positioning (avoids divergence from estimates).
 */
export function calculateDimensions(
  positions: Map<string, FlowPosition>,
  stageHeights: Map<string, number>,
  config: LayoutConfig,
): { width: number; height: number } {
  if (positions.size === 0) {
    return {
      width: config.containerPadding * 2,
      height: config.containerPadding * 2,
    };
  }

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  positions.forEach((pos, stageId) => {
    const nodeHeight = stageHeights.get(stageId) ?? config.nodeHeight;

    minX = Math.min(minX, pos.x);
    maxX = Math.max(maxX, pos.x + config.nodeWidth);
    minY = Math.min(minY, pos.y);
    maxY = Math.max(maxY, pos.y + nodeHeight);
  });

  return {
    width: maxX - minX + config.containerPadding * 2,
    height: maxY - minY + config.containerPadding * 2,
  };
}
