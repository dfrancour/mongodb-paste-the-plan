import type { NormalizedStage } from "#types/explain-plan";
import type { FlowPosition, FlowConnection } from "#types/flow-visualization";
import type { LayoutConfig } from "./config";

/**
 * Calculate horizontal anchor offset from node center.
 * Distributes anchors evenly across the node width.
 * @param usableWidthRatio - Percentage of node width to use (0.8 = 80%, 0.2 = 20%)
 */
export function calculateAnchorOffset(
  index: number,
  totalCount: number,
  nodeWidth: number,
  usableWidthRatio: number = 0.8,
): number {
  if (totalCount === 1) {
    return 0;
  }

  const usableWidth = nodeWidth * usableWidthRatio;
  const startOffset = -usableWidth / 2;

  const spacing = usableWidth / (totalCount - 1);
  return startOffset + spacing * index;
}

/**
 * Create connections with smart anchor points that distribute across node edges.
 * This prevents all arrows from converging to the center point.
 */
export function createConnectionsWithAnchors(
  stage: NormalizedStage,
  positions: Map<string, FlowPosition>,
  connections: FlowConnection[],
  config: LayoutConfig,
): void {
  const childrenByParent = new Map<string, NormalizedStage[]>();

  const buildChildrenByParent = (currentStage: NormalizedStage) => {
    currentStage.children.forEach((child) => {
      if (!childrenByParent.has(currentStage.id)) {
        childrenByParent.set(currentStage.id, []);
      }
      childrenByParent.get(currentStage.id)!.push(child);

      buildChildrenByParent(child);
    });
  };

  buildChildrenByParent(stage);

  const createConnection = (parentStage: NormalizedStage) => {
    const children = childrenByParent.get(parentStage.id) ?? [];
    const childCount = children.length;

    const sortedChildren = [...children].sort((a, b) => {
      const posA = positions.get(a.id);
      const posB = positions.get(b.id);
      return (posA?.x ?? 0) - (posB?.x ?? 0);
    });

    sortedChildren.forEach((child, index) => {
      const childAnchorOffsetX = calculateAnchorOffset(
        index,
        childCount,
        config.nodeWidth,
        0.8,
      );

      const parentAnchorOffsetX = calculateAnchorOffset(
        index,
        childCount,
        config.nodeWidth,
        0.2,
      );

      const connection: FlowConnection = {
        from: child.id,
        to: parentStage.id,
        dataVolume: child.metrics?.nReturned ?? 0,
        metrics: {
          nReturned: child.metrics?.nReturned,
          docsExamined: child.metrics?.docsExamined,
          keysExamined: child.metrics?.keysExamined,
        },
        fromAnchorOffsetX: childAnchorOffsetX,
        toAnchorOffsetX: parentAnchorOffsetX,
      };

      connections.push(connection);
      createConnection(child);
    });
  };

  createConnection(stage);
}
