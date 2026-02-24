import type { NormalizedStage } from "#types/explain-plan";
import type { FlowLayout } from "#types/flow-visualization";
import type { LayoutConfig } from "./config";
import { DEFAULT_LAYOUT_CONFIG } from "./config";
import { calculateLevels, groupByLevel } from "./levelCalculation";
import { calculateHorizontalPositions } from "./horizontalPositioning";
import { calculateLevelYPositions } from "./verticalPositioning";
import { resolveCollisions } from "./collisionResolution";
import { createConnectionsWithAnchors } from "./connectionGeneration";
import { calculateDimensions } from "./dimensionCalculation";
import { FlowNodeLogic } from "../flowNodeLogic";

/**
 * Calculate layout for normalized stage tree.
 *
 * Pipeline: levels → grouping → horizontal positions → vertical positions →
 * position map → collision resolution → connections → dimensions
 *
 * When `measuredHeights` is provided (from DOM measurements), those heights
 * override the internal estimates so that vertical spacing reflects actual
 * rendered node sizes rather than heuristic guesses.
 */
export function calculateLayout(
  rootStage: NormalizedStage,
  mode: "plan" | "execution" = "execution",
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG,
  measuredHeights?: ReadonlyMap<string, number>,
): FlowLayout {
  const positions = new Map<
    string,
    import("#types/flow-visualization").FlowPosition
  >();
  const connections: import("#types/flow-visualization").FlowConnection[] = [];

  // Step 1: Calculate levels (distance from root)
  const levels = calculateLevels(rootStage);

  // Step 2: Group stages by level
  const levelGroups = groupByLevel(rootStage, levels);

  // Step 3: Calculate horizontal positions within each level
  const horizontalPositionMap = calculateHorizontalPositions(
    levelGroups,
    config,
  );

  // Step 4: Calculate dynamic node heights for positioning
  // Use DOM-measured heights when available, falling back to estimates
  const stageHeights = new Map<string, number>();
  const calculateStageHeights = (stage: NormalizedStage) => {
    const height =
      measuredHeights?.get(stage.id) ??
      FlowNodeLogic.calculateNodeHeight(stage, mode);
    stageHeights.set(stage.id, height);
    stage.children.forEach((child) => calculateStageHeights(child));
  };
  calculateStageHeights(rootStage);

  // Step 5: Calculate vertical positions based on levels with dynamic heights
  const levelPositions = calculateLevelYPositions(levels, stageHeights, config);

  // Step 6: Create position map
  levels.forEach((level, stageId) => {
    const x = horizontalPositionMap.get(stageId) ?? 0;
    const y = levelPositions.get(level) ?? config.containerPadding;
    positions.set(stageId, { x, y, level });
  });

  // Step 7: Resolve node collisions
  resolveCollisions(positions, stageHeights, config);

  // Step 8: Create connections with smart anchor points
  createConnectionsWithAnchors(rootStage, positions, connections, config);

  // Step 9: Calculate overall dimensions
  const dimensions = calculateDimensions(positions, stageHeights, config);

  return {
    nodes: positions,
    connections,
    dimensions,
  };
}
