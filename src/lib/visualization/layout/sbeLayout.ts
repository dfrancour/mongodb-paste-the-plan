import type { ParsedSBEPlan } from "#types/explain-plan";
import type {
  FlowPosition,
  FlowConnection,
  FlowLayout,
  FlowStage,
} from "#types/flow-visualization";
import type { LayoutConfig } from "./config";
import { DEFAULT_LAYOUT_CONFIG } from "./config";
import { StageCategory, getStage, QuerySolutionStageType } from "#data/stages";
import { calculateNodeHeight } from "../flowNodeLogic";
import { calculateLevelYPositions } from "./verticalPositioning";
import { calculateDimensions } from "./dimensionCalculation";
import { resolveCollisions } from "./collisionResolution";
import { calculateAnchorOffset } from "./connectionGeneration";

// ---------------------------------------------------------------------------
// Stage classification — mediated through the stage glossary type system
// ---------------------------------------------------------------------------

const SCAN_CATEGORIES: ReadonlySet<StageCategory> = new Set([
  StageCategory.IndexScan,
  StageCategory.CollectionScan,
]);

const MULTI_INPUT_MERGE_TYPES: ReadonlySet<QuerySolutionStageType> = new Set([
  QuerySolutionStageType.STAGE_OR,
  QuerySolutionStageType.STAGE_AND_HASH,
  QuerySolutionStageType.STAGE_AND_SORTED,
  QuerySolutionStageType.STAGE_TEXT_OR,
  QuerySolutionStageType.STAGE_SORT_MERGE,
]);

function isScanCategory(category: StageCategory): boolean {
  return SCAN_CATEGORIES.has(category);
}

function isMultiInputMerge(stageName: string): boolean {
  const definition = getStage("planning", stageName);
  return (
    definition !== undefined &&
    MULTI_INPUT_MERGE_TYPES.has(definition.querySolutionStageType)
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate layout for SBE stages based on slot dependencies.
 *
 * Unlike the tree-based classic layout, SBE layout works from a flat list of
 * FlowStages and derives dependencies from the ParsedSBEPlan. The pipeline
 * reuses the shared vertical positioning, collision resolution, dimension
 * calculation, and anchor offset modules.
 */
export function calculateSBELayoutForStages(
  flowStages: FlowStage[],
  sbePlan: ParsedSBEPlan,
  mode: "plan" | "execution" = "execution",
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG,
): FlowLayout {
  const positions = new Map<string, FlowPosition>();
  const connections: FlowConnection[] = [];

  const slotDependencies = buildSlotDependencies(flowStages, sbePlan);
  const rawLevels = calculateSBELevels(flowStages, slotDependencies);

  if (rawLevels.size === 0) {
    return {
      nodes: positions,
      connections,
      dimensions: { width: 0, height: 0 },
    };
  }

  // Invert levels so leaves (level 0 in dependency order) end up at the
  // bottom (highest Y) and the root ends up at the top (level 0 in layout).
  // The shared calculateLevelYPositions places level 0 at the top.
  const maxLevel = Math.max(...rawLevels.values());
  const levels = new Map<string, number>();
  rawLevels.forEach((level, stageId) => {
    levels.set(stageId, maxLevel - level);
  });

  const horizontalPositions = calculateSBEHorizontalPositions(
    groupSBEStagesByLevel(flowStages, levels),
    config,
  );

  const stageHeights = new Map<string, number>();
  for (const stage of flowStages) {
    stageHeights.set(stage.id, calculateNodeHeight(stage, mode));
  }

  const levelPositions = calculateLevelYPositions(levels, stageHeights, config);

  levels.forEach((level, stageId) => {
    const x = horizontalPositions.get(stageId) ?? 0;
    const y = levelPositions.get(level) ?? config.containerPadding;
    positions.set(stageId, { x, y, level });
  });

  resolveCollisions(positions, stageHeights, config);

  createSBEConnections(
    flowStages,
    slotDependencies,
    positions,
    connections,
    config,
  );

  const dimensions = calculateDimensions(positions, stageHeights, config);

  return { nodes: positions, connections, dimensions };
}

// ---------------------------------------------------------------------------
// Dependency resolution — category-based with glossary lookup for merges
// ---------------------------------------------------------------------------

function buildSlotDependencies(
  flowStages: FlowStage[],
  sbePlan: ParsedSBEPlan,
): Map<string, string[]> {
  const dependencies = new Map<string, string[]>();

  const nodeIdToStageId = new Map<number, string>();
  for (const stage of flowStages) {
    const nodeId = extractNodeIdFromStageId(stage.id);
    if (nodeId !== -1) {
      nodeIdToStageId.set(nodeId, stage.id);
    }
  }

  const queryPlanDeps = extractQueryPlanDependencies(sbePlan, flowStages);

  for (const stage of flowStages) {
    const nodeId = extractNodeIdFromStageId(stage.id);
    if (nodeId === -1) {
      dependencies.set(stage.id, []);
      continue;
    }

    const dependentNodeIds = queryPlanDeps.get(nodeId) ?? [];
    const stageDeps = dependentNodeIds
      .map((depNodeId) => nodeIdToStageId.get(depNodeId))
      .filter((stageId): stageId is string => Boolean(stageId));

    dependencies.set(stage.id, stageDeps);
  }

  return dependencies;
}

/**
 * Resolve dependencies for each node in the SBE query plan.
 *
 * Classification uses the stage glossary type system:
 * - Scan categories (IndexScan, CollectionScan) → leaf, no dependencies
 * - Multi-input merge types (OR, AND_HASH, AND_SORTED, TEXT_OR, SORT_MERGE)
 *   → depends on all earlier scan stages
 * - All other stages → depends on nearest earlier node
 */
function extractQueryPlanDependencies(
  sbePlan: ParsedSBEPlan,
  flowStages: FlowStage[],
): Map<number, number[]> {
  const dependencies = new Map<number, number[]>();
  const nodeIds = Array.from(sbePlan.queryPlanStages.keys()).sort(
    (a, b) => a - b,
  );

  const categoryByNodeId = new Map<number, StageCategory>();
  for (const stage of flowStages) {
    const nodeId = extractNodeIdFromStageId(stage.id);
    if (nodeId !== -1) {
      categoryByNodeId.set(nodeId, stage.category);
    }
  }

  for (const nodeId of nodeIds) {
    const stageName = sbePlan.queryPlanStages.get(nodeId);
    if (!stageName) {
      dependencies.set(nodeId, []);
      continue;
    }

    const category = categoryByNodeId.get(nodeId) ?? StageCategory.Unknown;

    if (isScanCategory(category)) {
      dependencies.set(nodeId, []);
    } else if (isMultiInputMerge(stageName)) {
      dependencies.set(
        nodeId,
        nodeIds.filter(
          (id) =>
            id < nodeId &&
            isScanCategory(categoryByNodeId.get(id) ?? StageCategory.Unknown),
        ),
      );
    } else {
      const nearestEarlier = findNearestEarlierNodeId(nodeId, nodeIds);
      dependencies.set(
        nodeId,
        nearestEarlier !== undefined ? [nearestEarlier] : [],
      );
    }
  }

  return dependencies;
}

// ---------------------------------------------------------------------------
// Level calculation — dependency-based (leaves at 0, root at max)
// ---------------------------------------------------------------------------

function calculateSBELevels(
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
    const stageDeps = dependencies.get(stageId) ?? [];

    if (stageDeps.length === 0) {
      levels.set(stageId, 0);
      return 0;
    }

    const maxDepLevel = Math.max(...stageDeps.map(calculateLevel));
    const level = maxDepLevel + 1;
    levels.set(stageId, level);
    return level;
  };

  for (const stage of flowStages) {
    calculateLevel(stage.id);
  }

  return levels;
}

// ---------------------------------------------------------------------------
// Horizontal positioning — simple left-to-right within each level
// ---------------------------------------------------------------------------

function groupSBEStagesByLevel(
  flowStages: FlowStage[],
  levels: Map<string, number>,
): Map<number, FlowStage[]> {
  const groups = new Map<number, FlowStage[]>();
  for (const stage of flowStages) {
    const level = levels.get(stage.id) ?? 0;
    if (!groups.has(level)) {
      groups.set(level, []);
    }
    groups.get(level)!.push(stage);
  }
  return groups;
}

function calculateSBEHorizontalPositions(
  levelGroups: Map<number, FlowStage[]>,
  config: LayoutConfig,
): Map<string, number> {
  const positions = new Map<string, number>();
  levelGroups.forEach((stages) => {
    let currentX = 0;
    for (const stage of stages) {
      positions.set(stage.id, currentX);
      currentX += config.nodeWidth + config.horizontalSpacing;
    }
  });
  return positions;
}

// ---------------------------------------------------------------------------
// Connection generation — with anchor spreading for multi-input merges
// ---------------------------------------------------------------------------

function createSBEConnections(
  flowStages: FlowStage[],
  dependencies: Map<string, string[]>,
  positions: Map<string, FlowPosition>,
  connections: FlowConnection[],
  config: LayoutConfig,
): void {
  for (const stage of flowStages) {
    const producers = dependencies.get(stage.id) ?? [];

    const sortedProducers = [...producers].sort((a, b) => {
      const posA = positions.get(a);
      const posB = positions.get(b);
      return (posA?.x ?? 0) - (posB?.x ?? 0);
    });

    for (let i = 0; i < sortedProducers.length; i++) {
      const producerId = sortedProducers[i]!;
      const fromAnchorOffsetX = calculateAnchorOffset(
        i,
        sortedProducers.length,
        config.nodeWidth,
        0.8,
      );
      const toAnchorOffsetX = calculateAnchorOffset(
        i,
        sortedProducers.length,
        config.nodeWidth,
        0.2,
      );

      connections.push({
        from: producerId,
        to: stage.id,
        dataVolume: 1,
        metrics: {
          nReturned: stage.sbeData?.slots?.consumed.length ?? 0,
          docsExamined: 0,
          keysExamined: 0,
        },
        fromAnchorOffsetX,
        toAnchorOffsetX,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract numeric node ID from an SBE stage ID string (e.g. "sbe_node_3" → 3).
 * Returns -1 if the stageId does not match the expected pattern.
 */
function extractNodeIdFromStageId(stageId: string): number {
  const match = /sbe_node_(\d+)/.exec(stageId);
  return match?.[1] ? parseInt(match[1], 10) : -1;
}

function findNearestEarlierNodeId(
  nodeId: number,
  sortedNodeIds: number[],
): number | undefined {
  for (let i = sortedNodeIds.length - 1; i >= 0; i--) {
    if (sortedNodeIds[i]! < nodeId) {
      return sortedNodeIds[i];
    }
  }
  return undefined;
}
