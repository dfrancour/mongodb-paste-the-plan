import type { FlowPosition } from "#types/flow-visualization";
import type { LayoutConfig } from "./config";

interface NodeBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
}

/**
 * Resolve node collisions using both horizontal and vertical shifting.
 *
 * Same-level overlaps are resolved by shifting nodes horizontally.
 * Cross-level overlaps are resolved by pushing the deeper level (and all
 * levels below it) downward, preserving level alignment.
 *
 * Works from the positions map directly — no tree traversal needed.
 */
export function resolveCollisions(
  positions: Map<string, FlowPosition>,
  stageHeights: Map<string, number>,
  config: LayoutConfig,
): void {
  const getNodeBoxes = (): NodeBox[] => {
    const boxes: NodeBox[] = [];
    positions.forEach((position, stageId) => {
      const height = stageHeights.get(stageId) ?? config.nodeHeight;
      boxes.push({
        id: stageId,
        x: position.x,
        y: position.y,
        width: config.nodeWidth,
        height,
        level: position.level,
      });
    });
    return boxes;
  };

  const boxesOverlap = (box1: NodeBox, box2: NodeBox): boolean => {
    const horizontalOverlap =
      box1.x < box2.x + box2.width + config.minNodeSpacing &&
      box1.x + box1.width + config.minNodeSpacing > box2.x;
    const verticalOverlap =
      box1.y < box2.y + box2.height + config.minNodeSpacing &&
      box1.y + box1.height + config.minNodeSpacing > box2.y;
    return horizontalOverlap && verticalOverlap;
  };

  const MAX_ITERATIONS = 10;
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const boxes = getNodeBoxes();
    let collisionFound = false;

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const box1 = boxes[i];
        const box2 = boxes[j];
        if (!box1 || !box2) continue;

        if (boxesOverlap(box1, box2)) {
          collisionFound = true;

          if (box1.level === box2.level) {
            // Same level: shift the rightmost node further right
            const [left, right] =
              box1.x <= box2.x ? [box1, box2] : [box2, box1];
            const shiftAmount =
              left.x + left.width + config.minNodeSpacing - right.x;

            const currentPosition = positions.get(right.id);
            if (currentPosition) {
              positions.set(right.id, {
                ...currentPosition,
                x: currentPosition.x + shiftAmount,
              });
            }
          } else {
            // Different levels: push the deeper level (and below) down
            const [upper, lower] =
              box1.level < box2.level ? [box1, box2] : [box2, box1];
            const requiredY = upper.y + upper.height + config.minNodeSpacing;
            const shiftAmount = requiredY - lower.y;

            if (shiftAmount > 0) {
              shiftLevelsDown(positions, lower.level, shiftAmount);
            }
          }
        }
      }
    }

    if (!collisionFound) {
      break;
    }
  }
}

/**
 * Shift all nodes at the given level and deeper levels down by shiftAmount.
 * This preserves level alignment while resolving vertical overlaps.
 */
function shiftLevelsDown(
  positions: Map<string, FlowPosition>,
  fromLevel: number,
  shiftAmount: number,
): void {
  positions.forEach((pos, id) => {
    if (pos.level >= fromLevel) {
      positions.set(id, {
        ...pos,
        y: pos.y + shiftAmount,
      });
    }
  });
}
