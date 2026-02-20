import type {
  NormalizedStage,
  ParsedSBEPlan,
  HybridSBEPlan,
} from "#types/explain-plan";
import type {
  FlowPosition,
  FlowConnection,
  FlowLayout,
  FlowStage,
} from "#types/flow-visualization";
import type { AnalysisResults } from "#lib/analyzers";
import { createStageVisualization } from "./stageDisplayFormatter";
import { FlowNodeLogic } from "./flowNodeLogic";
import { StageCategory } from "#data/stages";

/**
 * Flow layout engine for positioning MongoDB stages in MongoDB Compass-style execution plans
 *
 * This engine calculates positions for stages in a bottom-to-top flow diagram,
 * with proper handling of merges and complex hierarchies.
 * Data sources (leaves) are positioned at the bottom, with data flowing upward to the final result (root) at the top.
 * Siblings (children of the same parent) are placed at the same vertical level.
 */
export class FlowLayoutEngine {
  private static readonly NODE_WIDTH = 300;
  private static readonly NODE_HEIGHT = 280;
  private static readonly HORIZONTAL_SPACING = 80;
  private static readonly VERTICAL_SPACING = 80;
  private static readonly CONTAINER_PADDING = 20;
  private static readonly MIN_NODE_SPACING = 40; // Minimum spacing between any two nodes

  /**
   * Calculate layout for normalized stage tree
   */
  static calculateLayout(
    rootStage: NormalizedStage,
    mode: "plan" | "execution" = "execution",
  ): FlowLayout {
    const positions = new Map<string, FlowPosition>();
    const connections: FlowConnection[] = [];

    // Step 1: Calculate levels (distance from leaves)
    const levels = this.calculateLevels(rootStage);

    // Step 2: Group stages by level
    const levelGroups = this.groupByLevel(rootStage, levels);

    // Step 3: Calculate vertical positions within each level
    const verticalPositions = this.calculateVerticalPositions(levelGroups);

    // Step 4: Calculate dynamic node heights for positioning
    const stageHeights = new Map<string, number>();
    const calculateStageHeights = (stage: NormalizedStage) => {
      const height = FlowNodeLogic.calculateNodeHeight(stage, mode);
      stageHeights.set(stage.id, height);
      stage.children.forEach((child) => calculateStageHeights(child));
    };
    calculateStageHeights(rootStage);

    // Step 5: Calculate vertical positions based on levels with dynamic heights
    const maxLevel = Math.max(...levels.values());
    const levelPositions = new Map<number, number>();

    // Calculate cumulative heights for each level (bottom-to-top data flow)
    // Level 0 (root) at top, deepest levels at bottom - data flows upward
    for (let level = 0; level <= maxLevel; level++) {
      if (level === 0) {
        // Root level starts at container padding
        levelPositions.set(level, this.CONTAINER_PADDING);
      } else {
        // Each level is positioned below the previous level
        const prevLevelPosition = levelPositions.get(level - 1) ?? 0;
        const prevLevelMaxHeight = Math.max(
          ...Array.from(levels.entries())
            .filter(([_, stageLevel]) => stageLevel === level - 1)
            .map(
              ([stageId, _]) => stageHeights.get(stageId) ?? this.NODE_HEIGHT,
            ),
        );
        levelPositions.set(
          level,
          prevLevelPosition + prevLevelMaxHeight + this.VERTICAL_SPACING,
        );
      }
    }

    // Step 6: Create position map with dynamic heights
    levels.forEach((level, stageId) => {
      const x = verticalPositions.get(stageId) ?? 0;
      const y = levelPositions.get(level) ?? this.CONTAINER_PADDING;
      positions.set(stageId, { x, y, level });
    });

    // Step 6: Resolve node collisions
    this.resolveCollisions(positions, stageHeights, rootStage);

    // Step 7: Create connections with smart anchor points
    this.createConnectionsWithAnchors(rootStage, positions, connections);

    // Step 8: Calculate overall dimensions
    const dimensions = this.calculateDimensions(positions, rootStage, mode);

    return {
      nodes: positions,
      connections,
      dimensions,
    };
  }

  /**
   * Resolve node collisions by shifting overlapping nodes horizontally
   * Uses iterative collision detection and resolution to ensure no nodes overlap
   */
  private static resolveCollisions(
    positions: Map<string, FlowPosition>,
    stageHeights: Map<string, number>,
    rootStage: NormalizedStage,
  ): void {
    // Build list of all nodes with their bounding boxes
    interface NodeBox {
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      level: number;
    }

    const getNodeBoxes = (): NodeBox[] => {
      const boxes: NodeBox[] = [];
      const collectBoxes = (stage: NormalizedStage) => {
        const position = positions.get(stage.id);
        const height = stageHeights.get(stage.id) ?? this.NODE_HEIGHT;
        if (position) {
          boxes.push({
            id: stage.id,
            x: position.x,
            y: position.y,
            width: this.NODE_WIDTH,
            height,
            level: position.level,
          });
        }
        stage.children.forEach((child) => collectBoxes(child));
      };
      collectBoxes(rootStage);
      return boxes;
    };

    // Check if two boxes overlap (with minimum spacing requirement)
    const boxesOverlap = (box1: NodeBox, box2: NodeBox): boolean => {
      const horizontalOverlap =
        box1.x < box2.x + box2.width + this.MIN_NODE_SPACING &&
        box1.x + box1.width + this.MIN_NODE_SPACING > box2.x;
      const verticalOverlap =
        box1.y < box2.y + box2.height + this.MIN_NODE_SPACING &&
        box1.y + box1.height + this.MIN_NODE_SPACING > box2.y;
      return horizontalOverlap && verticalOverlap;
    };

    // Iteratively resolve collisions (max 10 iterations to prevent infinite loops)
    const MAX_ITERATIONS = 10;
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const boxes = getNodeBoxes();
      let collisionFound = false;

      // Check all pairs for collisions
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const box1 = boxes[i];
          const box2 = boxes[j];
          if (!box1 || !box2) continue;

          if (boxesOverlap(box1, box2)) {
            collisionFound = true;

            // Shift the node with higher level (closer to root) to the right
            // This preserves the bottom-to-top data flow
            const nodeToShift = box1.level > box2.level ? box1 : box2;
            const shiftAmount =
              box1.level > box2.level
                ? box2.x + box2.width + this.MIN_NODE_SPACING - box1.x
                : box1.x + box1.width + this.MIN_NODE_SPACING - box2.x;

            const currentPosition = positions.get(nodeToShift.id);
            if (currentPosition) {
              positions.set(nodeToShift.id, {
                ...currentPosition,
                x: currentPosition.x + shiftAmount,
              });
            }
          }
        }
      }

      // If no collisions found, we're done
      if (!collisionFound) {
        break;
      }
    }
  }

  /**
   * Create connections with smart anchor points that distribute across node edges
   * This prevents all arrows from converging to the center point
   */
  private static createConnectionsWithAnchors(
    stage: NormalizedStage,
    positions: Map<string, FlowPosition>,
    connections: FlowConnection[],
  ) {
    // First pass: count children and parents for each node
    const childCounts = new Map<string, number>();
    const parentCounts = new Map<string, number>();
    const childrenByParent = new Map<string, NormalizedStage[]>();

    const countRelationships = (currentStage: NormalizedStage) => {
      childCounts.set(currentStage.id, currentStage.children.length);

      currentStage.children.forEach((child) => {
        parentCounts.set(child.id, (parentCounts.get(child.id) ?? 0) + 1);

        if (!childrenByParent.has(currentStage.id)) {
          childrenByParent.set(currentStage.id, []);
        }
        childrenByParent.get(currentStage.id)!.push(child);

        countRelationships(child);
      });
    };

    countRelationships(stage);

    // Second pass: create connections with anchor offsets
    const createConnection = (parentStage: NormalizedStage) => {
      const children = childrenByParent.get(parentStage.id) ?? [];
      const childCount = children.length;

      // Sort children by their x position for consistent anchor assignment
      const sortedChildren = [...children].sort((a, b) => {
        const posA = positions.get(a.id);
        const posB = positions.get(b.id);
        return (posA?.x ?? 0) - (posB?.x ?? 0);
      });

      sortedChildren.forEach((child, index) => {
        // Calculate anchor offset for children's top edges - spread them out
        const childAnchorOffsetX = this.calculateAnchorOffset(
          index,
          childCount,
          this.NODE_WIDTH,
          0.8, // Use 80% of width for spreading
        );

        // Calculate anchor offset for parent's bottom edge - converge to center
        // Use much smaller spread to create fan-in effect
        const parentAnchorOffsetX = this.calculateAnchorOffset(
          index,
          childCount,
          this.NODE_WIDTH,
          0.2, // Use only 20% of width for tighter convergence
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
          fromAnchorOffsetX: childAnchorOffsetX, // Child's top edge - spread out
          toAnchorOffsetX: parentAnchorOffsetX, // Parent's bottom edge - converge
        };

        connections.push(connection);
        createConnection(child);
      });
    };

    createConnection(stage);
  }

  /**
   * Calculate horizontal anchor offset from node center
   * Distributes anchors evenly across the node width
   * @param usableWidthRatio - Percentage of node width to use (0.8 = 80%, 0.2 = 20%)
   */
  private static calculateAnchorOffset(
    index: number,
    totalCount: number,
    nodeWidth: number,
    usableWidthRatio: number = 0.8,
  ): number {
    if (totalCount === 1) {
      return 0; // Center position
    }

    // Use specified percentage of width to control spread
    const usableWidth = nodeWidth * usableWidthRatio;
    const startOffset = -usableWidth / 2;

    // Distribute evenly across the usable width
    const spacing = usableWidth / (totalCount - 1);
    return startOffset + spacing * index;
  }

  /**
   * Calculate SBE-specific layout with slot-based positioning
   */
  static calculateSBELayout(
    rootStage: NormalizedStage,
    sbePlan?: ParsedSBEPlan,
    hybridPlan?: HybridSBEPlan,
    mode: "plan" | "execution" = "execution",
  ): FlowLayout {
    // For now, use the classic layout as a foundation and enhance it for SBE
    const baseLayout = this.calculateLayout(rootStage, mode);

    // TODO: Enhance with SBE-specific positioning logic
    // - Position stages based on slot lineage dependencies
    // - Optimize for slot flow visualization
    // - Handle SBE-specific stage types and connections

    return this.enhanceLayoutForSBE(baseLayout, sbePlan, hybridPlan);
  }

  /**
   * Calculate layout for multiple SBE stages based on slot dependencies
   */
  static calculateSBELayoutForStages(
    flowStages: FlowStage[],
    sbePlan: ParsedSBEPlan,
    mode: "plan" | "execution" = "execution",
  ): FlowLayout {
    const positions = new Map<string, FlowPosition>();
    const connections: FlowConnection[] = [];

    // Step 1: Build slot dependency graph
    const slotDependencies = this.buildSlotDependencies(flowStages, sbePlan);

    // Step 2: Calculate levels based on slot dependencies (bottom-to-top)
    const levels = this.calculateSBELevels(flowStages, slotDependencies);

    // Step 3: Group stages by level
    const levelGroups = this.groupSBEStagesByLevel(flowStages, levels);

    // Step 4: Calculate horizontal positions within each level
    const horizontalPositions =
      this.calculateSBEHorizontalPositions(levelGroups);

    // Step 5: Calculate dynamic node heights for positioning
    const stageHeights = new Map<string, number>();
    flowStages.forEach((stage) => {
      const height = FlowNodeLogic.calculateNodeHeight(stage, mode);
      stageHeights.set(stage.id, height);
    });

    // Step 6: Calculate vertical positions based on levels with dynamic heights
    const maxLevel = Math.max(...levels.values());
    const levelPositions = new Map<number, number>();

    // SBE layout uses dependency-based levels where leaves (sources) are at level 0
    // Calculate cumulative heights (bottom-to-top data flow)
    // Level 0 (leaves) at bottom, higher levels above - data flows upward
    for (let level = maxLevel; level >= 0; level--) {
      if (level === maxLevel) {
        // Top level (root) starts at container padding
        levelPositions.set(level, this.CONTAINER_PADDING);
      } else {
        // Each level is positioned below the previous level
        const nextLevelPosition = levelPositions.get(level + 1) ?? 0;
        const nextLevelMaxHeight = Math.max(
          ...Array.from(levels.entries())
            .filter(([_, stageLevel]) => stageLevel === level + 1)
            .map(
              ([stageId, _]) => stageHeights.get(stageId) ?? this.NODE_HEIGHT,
            ),
        );
        levelPositions.set(
          level,
          nextLevelPosition + nextLevelMaxHeight + this.VERTICAL_SPACING,
        );
      }
    }

    // Step 7: Create position map with dynamic heights
    levels.forEach((level, stageId) => {
      const x = horizontalPositions.get(stageId) ?? 0;
      const y = levelPositions.get(level) ?? this.CONTAINER_PADDING;
      positions.set(stageId, { x, y, level });
    });

    // Step 6: Create slot-based connections
    this.createSBEConnections(
      flowStages,
      slotDependencies,
      positions,
      connections,
    );

    // Step 7: Calculate overall dimensions
    const dimensions = this.calculateSBEDimensions(positions, flowStages);

    return {
      nodes: positions,
      connections,
      dimensions,
    };
  }

  /**
   * Build slot dependency graph for SBE stages
   */
  private static buildSlotDependencies(
    flowStages: FlowStage[],
    sbePlan: ParsedSBEPlan,
  ): Map<string, string[]> {
    // Instead of using slot producer/consumer relationships, build dependencies
    // based on the hierarchical tree structure from the original SBE stages
    return this.buildTreeBasedDependencies(flowStages, sbePlan);
  }

  /**
   * Build dependencies based on tree structure and SBE node relationships
   */
  private static buildTreeBasedDependencies(
    flowStages: FlowStage[],
    sbePlan: ParsedSBEPlan,
  ): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();

    // Build dependencies based on the actual queryPlan structure from the explain plan
    // We need to examine the original queryPlan to understand parent-child relationships
    const nodeIdToStageId = new Map<number, string>();
    flowStages.forEach((stage) => {
      const nodeId = this.extractNodeIdFromStageId(stage.id);
      nodeIdToStageId.set(nodeId, stage.id);
    });

    // Extract dependencies from the queryPlan structure in the original explain plan
    // This requires looking at the actual plan structure, not just sequential nodeIds
    const queryPlanDependencies = this.extractQueryPlanDependencies(sbePlan);

    // Convert queryPlan dependencies to FlowStage dependencies
    flowStages.forEach((stage) => {
      const nodeId = this.extractNodeIdFromStageId(stage.id);
      const dependentNodeIds = queryPlanDependencies.get(nodeId) ?? [];

      const stageDependencies = dependentNodeIds
        .map((depNodeId) => nodeIdToStageId.get(depNodeId))
        .filter((stageId): stageId is string => Boolean(stageId));

      dependencies.set(stage.id, stageDependencies);
    });

    return dependencies;
  }

  /**
   * Extract dependencies from the queryPlan structure
   * This handles complex multi-input operations like text search OR queries
   */
  private static extractQueryPlanDependencies(
    sbePlan: ParsedSBEPlan,
  ): Map<number, number[]> {
    const dependencies = new Map<number, number[]>();

    // For now, use a simplified heuristic based on nodeId ordering
    // TODO: This should be enhanced to parse the actual queryPlan structure
    // from the original explain plan to get true parent-child relationships

    const nodeIds = Array.from(sbePlan.queryPlanStages.keys()).sort(
      (a, b) => a - b,
    );

    nodeIds.forEach((nodeId) => {
      const stageName = sbePlan.queryPlanStages.get(nodeId);

      if (!stageName) {
        dependencies.set(nodeId, []);
        return;
      }

      // Define dependency patterns based on common MongoDB stage relationships
      switch (stageName) {
        case "IXSCAN":
          // IXSCAN stages are typically leaf nodes with no dependencies
          dependencies.set(nodeId, []);
          break;

        case "OR":
        case "AND_HASH":
        case "UNION":
          // Multi-input stages depend on all previous IXSCAN stages
          const ixscanNodeIds = nodeIds.filter(
            (id) => id < nodeId && sbePlan.queryPlanStages.get(id) === "IXSCAN",
          );
          dependencies.set(nodeId, ixscanNodeIds);
          break;

        case "FETCH":
          // FETCH typically depends on the most recent index scan or merge operation
          const candidateDeps = nodeIds.filter((id) => {
            const candidateStage = sbePlan.queryPlanStages.get(id);
            return (
              id < nodeId &&
              (candidateStage === "IXSCAN" ||
                candidateStage === "OR" ||
                candidateStage === "AND_HASH" ||
                candidateStage === "UNION")
            );
          });
          const fetchDep =
            candidateDeps.length > 0
              ? [candidateDeps[candidateDeps.length - 1]!]
              : [];
          dependencies.set(nodeId, fetchDep);
          break;

        case "TEXT_MATCH":
        case "SORT":
        case "LIMIT":
        case "PROJECTION_DEFAULT":
          // These stages typically depend on the most recent processing stage
          const processingDeps = nodeIds.filter((id) => {
            const candidateStage = sbePlan.queryPlanStages.get(id);
            return (
              id < nodeId &&
              (candidateStage === "FETCH" ||
                candidateStage === "OR" ||
                candidateStage === "AND_HASH" ||
                candidateStage === "IXSCAN")
            );
          });
          const processingDep =
            processingDeps.length > 0
              ? [processingDeps[processingDeps.length - 1]!]
              : [];
          dependencies.set(nodeId, processingDep);
          break;

        default:
          // For unknown stages, depend on the immediately previous stage
          const prevNodeId = nodeIds.find((id) => id === nodeId - 1);
          dependencies.set(
            nodeId,
            prevNodeId !== undefined ? [prevNodeId] : [],
          );
          break;
      }
    });

    return dependencies;
  }

  /**
   * Extract node ID from stage ID (e.g., "sbe_node_2" -> 2)
   */
  private static extractNodeIdFromStageId(stageId: string): number {
    const match = /sbe_node_(\d+)/.exec(stageId);
    return match?.[1] ? parseInt(match[1], 10) : 0;
  }

  /**
   * Calculate levels for SBE stages based on slot dependencies
   */
  private static calculateSBELevels(
    flowStages: FlowStage[],
    dependencies: Map<string, string[]>,
  ): Map<string, number> {
    const levels = new Map<string, number>();
    const visited = new Set<string>();

    const calculateLevel = (stageId: string): number => {
      if (visited.has(stageId)) {
        return levels.get(stageId) ?? 0;
      }

      visited.add(stageId);
      const stageDependencies = dependencies.get(stageId) ?? [];

      if (stageDependencies.length === 0) {
        // This is a source stage (no dependencies) - level 0 at bottom
        levels.set(stageId, 0);
        return 0;
      }

      // Calculate level based on maximum dependency level + 1
      const dependencyLevels = stageDependencies.map((depId) =>
        calculateLevel(depId),
      );
      const maxDependencyLevel = Math.max(...dependencyLevels);
      const level = maxDependencyLevel + 1;

      levels.set(stageId, level);
      return level;
    };

    // Calculate levels for all stages
    flowStages.forEach((stage) => calculateLevel(stage.id));

    return levels;
  }

  /**
   * Group SBE stages by their calculated levels
   */
  private static groupSBEStagesByLevel(
    flowStages: FlowStage[],
    levels: Map<string, number>,
  ): Map<number, FlowStage[]> {
    const groups = new Map<number, FlowStage[]>();

    flowStages.forEach((stage) => {
      const level = levels.get(stage.id) ?? 0;
      if (!groups.has(level)) {
        groups.set(level, []);
      }
      groups.get(level)!.push(stage);
    });

    return groups;
  }

  /**
   * Calculate horizontal positions for SBE stages within each level
   */
  private static calculateSBEHorizontalPositions(
    levelGroups: Map<number, FlowStage[]>,
  ): Map<string, number> {
    const positions = new Map<string, number>();

    levelGroups.forEach((stages, _level) => {
      let currentX = 0;

      stages.forEach((stage) => {
        positions.set(stage.id, currentX);
        currentX += this.NODE_WIDTH + this.HORIZONTAL_SPACING;
      });
    });

    return positions;
  }

  /**
   * Create slot-based connections between SBE stages
   */
  private static createSBEConnections(
    flowStages: FlowStage[],
    dependencies: Map<string, string[]>,
    positions: Map<string, FlowPosition>,
    connections: FlowConnection[],
  ) {
    flowStages.forEach((stage) => {
      const producers = dependencies.get(stage.id) ?? [];

      producers.forEach((producerId) => {
        const connection: FlowConnection = {
          from: producerId,
          to: stage.id,
          dataVolume: 1, // SBE connections are slot-based, not volume-based
          metrics: {
            // SBE-specific connection metrics (slots transferred)
            nReturned: stage.sbeData?.slots?.consumed.length ?? 0,
            docsExamined: 0,
            keysExamined: 0,
          },
        };

        connections.push(connection);
      });
    });
  }

  /**
   * Calculate overall dimensions for SBE layout
   */
  private static calculateSBEDimensions(
    positions: Map<string, FlowPosition>,
    _flowStages: FlowStage[],
  ): { width: number; height: number } {
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    positions.forEach((pos, _stageId) => {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x + this.NODE_WIDTH);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y + this.NODE_HEIGHT);
    });

    return {
      width: maxX - minX + this.CONTAINER_PADDING * 2,
      height: maxY - minY + this.CONTAINER_PADDING * 2,
    };
  }

  /**
   * Enhance existing layout with SBE-specific optimizations
   */
  private static enhanceLayoutForSBE(
    layout: FlowLayout,
    _sbePlan?: ParsedSBEPlan,
    _hybridPlan?: HybridSBEPlan,
  ): FlowLayout {
    // TODO: Implement SBE-specific layout enhancements
    // - Add slot connection lines
    // - Optimize spacing for slot interaction
    // - Handle SBE stage grouping

    return {
      ...layout,
      // For now, preserve the classic layout structure
      // Future enhancements will add SBE-specific positioning
    };
  }

  /**
   * Calculate the level (depth from root) for each stage
   * Siblings (children of the same parent) will be at the same level
   */
  private static calculateLevels(stage: NormalizedStage): Map<string, number> {
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
  private static groupByLevel(
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

  /**
   * Calculate horizontal positions within each level with dynamic width support
   * (formerly vertical positions, now horizontal for bottom-to-top flow)
   */
  private static calculateVerticalPositions(
    levelGroups: Map<number, NormalizedStage[]>,
  ): Map<string, number> {
    const positions = new Map<string, number>();

    levelGroups.forEach((stages, _level) => {
      // Group stages by their merge relationships
      const mergeGroups = this.groupStagesByMergeRelationship(stages);

      let currentX = 0;

      mergeGroups.forEach((group) => {
        if (group.length === 1) {
          // Single stage - normal positioning
          const stage = group[0];
          if (stage) {
            positions.set(stage.id, currentX);
            // Use standard node width for horizontal spacing
            currentX += this.NODE_WIDTH + this.HORIZONTAL_SPACING;
          }
        } else {
          // Multi-input merge - calculate max width in group
          let maxGroupWidth = this.NODE_WIDTH;
          const groupPositions: Array<{
            stage: NormalizedStage;
            width: number;
          }> = [];

          group.forEach((stage) => {
            // Use standard node width for horizontal group spacing
            const nodeWidth = this.NODE_WIDTH;
            maxGroupWidth = Math.max(maxGroupWidth, nodeWidth);
            groupPositions.push({ stage, width: nodeWidth });
          });

          // Position nodes in the group horizontally
          groupPositions.forEach(({ stage }, index) => {
            const x =
              currentX + index * (maxGroupWidth + this.HORIZONTAL_SPACING);
            positions.set(stage.id, x);
          });

          currentX +=
            group.length * maxGroupWidth +
            (group.length - 1) * this.HORIZONTAL_SPACING +
            this.HORIZONTAL_SPACING * 2;
        }
      });
    });

    return positions;
  }

  /**
   * Group stages by their merge relationships for better layout
   */
  private static groupStagesByMergeRelationship(
    stages: NormalizedStage[],
  ): NormalizedStage[][] {
    const groups: NormalizedStage[][] = [];
    const processed = new Set<string>();

    stages.forEach((stage) => {
      if (processed.has(stage.id)) return;

      // Check if this stage is part of a multi-input merge
      const mergeStages = this.findMergeGroup(stage, stages);

      if (mergeStages.length > 1) {
        // Sort merge inputs for consistent layout - diagnostic priority (worst performance first)
        const sortedMerge = mergeStages.sort((a, b) => {
          return this.getLayoutSortPriority(a) - this.getLayoutSortPriority(b);
        });

        groups.push(sortedMerge);
        sortedMerge.forEach((s) => processed.add(s.id));
      } else {
        groups.push([stage]);
        processed.add(stage.id);
      }
    });

    return groups;
  }

  /**
   * Get layout sort priority for a stage based on its category.
   * Lower numbers sort first (worst performance = more diagnostic attention).
   */
  private static getLayoutSortPriority(stage: NormalizedStage): number {
    switch (stage.category) {
      case StageCategory.CollectionScan:
        return 0; // Full table scan - immediate red flag
      case StageCategory.IndexScan:
        return 10; // Index scans - good performance
      case StageCategory.Fetch:
        return 20; // Document retrieval
      case StageCategory.QueryPlanning:
      case StageCategory.Internal:
        return 30; // Wrapper/organizational stages
      default:
        return 50; // Unknown or other categories
    }
  }

  /**
   * Find stages that should be grouped together for merge operations
   */
  private static findMergeGroup(
    stage: NormalizedStage,
    allStages: NormalizedStage[],
  ): NormalizedStage[] {
    // Check if multiple stages at this level feed into the same parent
    const siblingsWithSameParent = allStages.filter((s) => {
      // This is a simplified check - in a real implementation, we'd need to
      // track parent-child relationships more explicitly
      return (
        s.depth === stage.depth && this.shareCommonParent(s, stage, allStages)
      );
    });

    return siblingsWithSameParent.length > 1 ? siblingsWithSameParent : [stage];
  }

  /**
   * Check if two stages share a common parent (simplified implementation)
   */
  private static shareCommonParent(
    stage1: NormalizedStage,
    stage2: NormalizedStage,
    _allStages: NormalizedStage[],
  ): boolean {
    // For now, assume stages at the same depth with similar paths share a parent
    // This is a simplified heuristic - could be improved with explicit parent tracking
    const path1Parts = stage1.id.split(".");
    const path2Parts = stage2.id.split(".");

    if (path1Parts.length !== path2Parts.length) return false;

    // Check if they share the same parent path
    const parentPath1 = path1Parts.slice(0, -1).join(".");
    const parentPath2 = path2Parts.slice(0, -1).join(".");

    return parentPath1 === parentPath2;
  }

  /**
   * Create connections between stages
   */
  private static createConnections(
    stage: NormalizedStage,
    positions: Map<string, FlowPosition>,
    connections: FlowConnection[],
  ) {
    const traverse = (currentStage: NormalizedStage) => {
      currentStage.children.forEach((child) => {
        const connection: FlowConnection = {
          from: child.id,
          to: currentStage.id,
          dataVolume: child.metrics?.nReturned ?? 0,
          metrics: {
            nReturned: child.metrics?.nReturned,
            docsExamined: child.metrics?.docsExamined,
            keysExamined: child.metrics?.keysExamined,
          },
        };

        connections.push(connection);
        traverse(child);
      });
    };

    traverse(stage);
  }

  /**
   * Calculate overall dimensions of the layout with dynamic heights
   */
  private static calculateDimensions(
    positions: Map<string, FlowPosition>,
    rootStage: NormalizedStage,
    mode: "plan" | "execution" = "execution",
  ): { width: number; height: number } {
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    // Calculate actual node heights for dimension calculation
    const stageHeights = new Map<string, number>();

    const calculateStageHeights = (stage: NormalizedStage) => {
      const height = FlowNodeLogic.calculateNodeHeight(stage, mode);
      stageHeights.set(stage.id, height);
      stage.children.forEach((child) => calculateStageHeights(child));
    };

    calculateStageHeights(rootStage);

    positions.forEach((pos, stageId) => {
      const nodeHeight = stageHeights.get(stageId) ?? this.NODE_HEIGHT;

      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x + this.NODE_WIDTH);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y + nodeHeight);
    });

    return {
      width: maxX - minX + this.CONTAINER_PADDING * 2,
      height: maxY - minY + this.CONTAINER_PADDING * 2,
    };
  }

  /**
   * Transform a normalized stage tree into flow stages with positions
   */
  static transformToFlowStages(
    rootStage: NormalizedStage,
    layout: FlowLayout,
    analysisResults: AnalysisResults,
  ): FlowStage[] {
    const flowStages: FlowStage[] = [];

    const traverse = (stage: NormalizedStage) => {
      const position = layout.nodes.get(stage.id);
      if (!position) return;

      const connections = layout.connections.filter(
        (conn) => conn.from === stage.id,
      );

      const stageVisualization = createStageVisualization(
        stage,
        analysisResults,
      );

      const flowStage: FlowStage = {
        ...stage,
        position,
        connections,
        visualization: stageVisualization,
        state: {
          isHighlighted: false,
          showTooltip: false,
        },
      };

      flowStages.push(flowStage);

      stage.children.forEach((child) => traverse(child));
    };

    traverse(rootStage);
    return flowStages;
  }
}
