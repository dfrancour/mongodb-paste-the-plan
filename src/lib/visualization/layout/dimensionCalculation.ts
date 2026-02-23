import type { NormalizedStage } from "#types/explain-plan";
import type { FlowPosition } from "#types/flow-visualization";
import type { LayoutConfig } from "./config";
import { FlowNodeLogic } from "../flowNodeLogic";

/**
 * Calculate overall dimensions of the layout with dynamic heights
 */
export function calculateDimensions(
  positions: Map<string, FlowPosition>,
  rootStage: NormalizedStage,
  config: LayoutConfig,
  mode: "plan" | "execution" = "execution",
): { width: number; height: number } {
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  const stageHeights = new Map<string, number>();

  const calculateStageHeights = (stage: NormalizedStage) => {
    const height = FlowNodeLogic.calculateNodeHeight(stage, mode);
    stageHeights.set(stage.id, height);
    stage.children.forEach((child) => calculateStageHeights(child));
  };

  calculateStageHeights(rootStage);

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
