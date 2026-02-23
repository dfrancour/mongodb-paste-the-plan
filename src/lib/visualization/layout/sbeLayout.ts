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
import type { LayoutConfig } from "./config";
import { DEFAULT_LAYOUT_CONFIG } from "./config";
import { FlowNodeLogic } from "../flowNodeLogic";
import { calculateLayout } from "./pipeline";

/**
 * Calculate SBE-specific layout with slot-based positioning
 */
export function calculateSBELayout(
  rootStage: NormalizedStage,
  sbePlan?: ParsedSBEPlan,
  hybridPlan?: HybridSBEPlan,
  mode: "plan" | "execution" = "execution",
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG,
): FlowLayout {
  const baseLayout = calculateLayout(rootStage, mode, config);
  return enhanceLayoutForSBE(baseLayout, sbePlan, hybridPlan);
}

/**
 * Calculate layout for multiple SBE stages based on slot dependencies
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
  const levels = calculateSBELevels(flowStages, slotDependencies);

  // Guard: empty levels → return safe empty result
  if (levels.size === 0) {
    return {
      nodes: positions,
      connections,
      dimensions: { width: 0, height: 0 },
    };
  }

  const levelGroups = groupSBEStagesByLevel(flowStages, levels);
  const horizontalPositions = calculateSBEHorizontalPositions(
    levelGroups,
    config,
  );

  const stageHeights = new Map<string, number>();
  flowStages.forEach((stage) => {
    const height = FlowNodeLogic.calculateNodeHeight(stage, mode);
    stageHeights.set(stage.id, height);
  });

  const maxLevel = Math.max(...levels.values());
  const levelPositions = new Map<number, number>();

  for (let level = maxLevel; level >= 0; level--) {
    if (level === maxLevel) {
      levelPositions.set(level, config.containerPadding);
    } else {
      const nextLevelPosition = levelPositions.get(level + 1) ?? 0;
      const nextLevelMaxHeight = Math.max(
        ...Array.from(levels.entries())
          .filter(([_, stageLevel]) => stageLevel === level + 1)
          .map(
            ([stageId, _]) => stageHeights.get(stageId) ?? config.nodeHeight,
          ),
      );
      levelPositions.set(
        level,
        nextLevelPosition + nextLevelMaxHeight + config.verticalSpacing,
      );
    }
  }

  levels.forEach((level, stageId) => {
    const x = horizontalPositions.get(stageId) ?? 0;
    const y = levelPositions.get(level) ?? config.containerPadding;
    positions.set(stageId, { x, y, level });
  });

  createSBEConnections(flowStages, slotDependencies, positions, connections);

  const dimensions = calculateSBEDimensions(positions, config);

  return {
    nodes: positions,
    connections,
    dimensions,
  };
}

function buildSlotDependencies(
  flowStages: FlowStage[],
  sbePlan: ParsedSBEPlan,
): Map<string, string[]> {
  return buildTreeBasedDependencies(flowStages, sbePlan);
}

function buildTreeBasedDependencies(
  flowStages: FlowStage[],
  sbePlan: ParsedSBEPlan,
): Map<string, string[]> {
  const dependencies = new Map<string, string[]>();

  const nodeIdToStageId = new Map<number, string>();
  flowStages.forEach((stage) => {
    const nodeId = extractNodeIdFromStageId(stage.id);
    if (nodeId !== -1) {
      nodeIdToStageId.set(nodeId, stage.id);
    }
  });

  const queryPlanDependencies = extractQueryPlanDependencies(sbePlan);

  flowStages.forEach((stage) => {
    const nodeId = extractNodeIdFromStageId(stage.id);
    if (nodeId === -1) {
      dependencies.set(stage.id, []);
      return;
    }

    const dependentNodeIds = queryPlanDependencies.get(nodeId) ?? [];

    const stageDependencies = dependentNodeIds
      .map((depNodeId) => nodeIdToStageId.get(depNodeId))
      .filter((stageId): stageId is string => Boolean(stageId));

    dependencies.set(stage.id, stageDependencies);
  });

  return dependencies;
}

/**
 * SBE stage dependency strategies.
 * Maps stage names to functions that determine their dependencies given the
 * sorted list of node IDs and access to the plan's stage map.
 *
 * Assumed SBE plan shape: queryPlanStages is a Map<number, string> where
 * the key is a numeric node ID and the value is the stage name.
 * Node IDs are generally sequential but may have gaps.
 *
 * Handled stages: IXSCAN (leaf), OR/AND_HASH/UNION (multi-input merge),
 * FETCH (single-input from scan/merge), TEXT_MATCH/SORT/LIMIT/PROJECTION_DEFAULT
 * (single-input processing stages).
 *
 * Unknown stages fall back to the nearest earlier node ID.
 */
const SBE_DEPENDENCY_STRATEGIES: Record<
  string,
  (
    nodeId: number,
    nodeIds: number[],
    getStage: (id: number) => string | undefined,
  ) => number[]
> = {
  // Leaf stage — no dependencies
  IXSCAN: () => [],

  // Multi-input merge — depends on all earlier IXSCAN stages
  OR: (_nodeId, nodeIds, getStage) =>
    nodeIds.filter((id) => id < _nodeId && getStage(id) === "IXSCAN"),
  AND_HASH: (_nodeId, nodeIds, getStage) =>
    nodeIds.filter((id) => id < _nodeId && getStage(id) === "IXSCAN"),
  UNION: (_nodeId, nodeIds, getStage) =>
    nodeIds.filter((id) => id < _nodeId && getStage(id) === "IXSCAN"),

  // Fetch — depends on the nearest earlier scan/merge stage
  FETCH: (nodeId, nodeIds, getStage) => {
    const candidates = nodeIds.filter((id) => {
      const stage = getStage(id);
      return (
        id < nodeId &&
        (stage === "IXSCAN" ||
          stage === "OR" ||
          stage === "AND_HASH" ||
          stage === "UNION")
      );
    });
    return candidates.length > 0 ? [candidates[candidates.length - 1]!] : [];
  },

  // Processing stages — depend on nearest earlier fetch/scan/merge
  TEXT_MATCH: (nodeId, nodeIds, getStage) =>
    findNearestProcessingDep(nodeId, nodeIds, getStage),
  SORT: (nodeId, nodeIds, getStage) =>
    findNearestProcessingDep(nodeId, nodeIds, getStage),
  LIMIT: (nodeId, nodeIds, getStage) =>
    findNearestProcessingDep(nodeId, nodeIds, getStage),
  PROJECTION_DEFAULT: (nodeId, nodeIds, getStage) =>
    findNearestProcessingDep(nodeId, nodeIds, getStage),
};

function findNearestProcessingDep(
  nodeId: number,
  nodeIds: number[],
  getStage: (id: number) => string | undefined,
): number[] {
  const candidates = nodeIds.filter((id) => {
    const stage = getStage(id);
    return (
      id < nodeId &&
      (stage === "FETCH" ||
        stage === "OR" ||
        stage === "AND_HASH" ||
        stage === "IXSCAN")
    );
  });
  return candidates.length > 0 ? [candidates[candidates.length - 1]!] : [];
}

function extractQueryPlanDependencies(
  sbePlan: ParsedSBEPlan,
): Map<number, number[]> {
  const dependencies = new Map<number, number[]>();

  const nodeIds = Array.from(sbePlan.queryPlanStages.keys()).sort(
    (a, b) => a - b,
  );

  const getStage = (id: number) => sbePlan.queryPlanStages.get(id);

  nodeIds.forEach((nodeId) => {
    const stageName = sbePlan.queryPlanStages.get(nodeId);

    if (!stageName) {
      dependencies.set(nodeId, []);
      return;
    }

    const strategy = SBE_DEPENDENCY_STRATEGIES[stageName];
    if (strategy) {
      dependencies.set(nodeId, strategy(nodeId, nodeIds, getStage));
    } else {
      // Unknown stage: fall back to nearest earlier node ID
      const nearestEarlier = findNearestEarlierNodeId(nodeId, nodeIds);
      dependencies.set(
        nodeId,
        nearestEarlier !== undefined ? [nearestEarlier] : [],
      );
    }
  });

  return dependencies;
}

/**
 * Find the largest node ID that is strictly less than the given nodeId.
 */
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

/**
 * Extract numeric node ID from an SBE stage ID string (e.g. "sbe_node_3" → 3).
 * Returns -1 if the stageId does not match the expected pattern.
 */
function extractNodeIdFromStageId(stageId: string): number {
  const match = /sbe_node_(\d+)/.exec(stageId);
  return match?.[1] ? parseInt(match[1], 10) : -1;
}

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
    const stageDependencies = dependencies.get(stageId) ?? [];

    if (stageDependencies.length === 0) {
      levels.set(stageId, 0);
      return 0;
    }

    const dependencyLevels = stageDependencies.map((depId) =>
      calculateLevel(depId),
    );
    const maxDependencyLevel = Math.max(...dependencyLevels);
    const level = maxDependencyLevel + 1;

    levels.set(stageId, level);
    return level;
  };

  flowStages.forEach((stage) => calculateLevel(stage.id));

  return levels;
}

function groupSBEStagesByLevel(
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

function calculateSBEHorizontalPositions(
  levelGroups: Map<number, FlowStage[]>,
  config: LayoutConfig,
): Map<string, number> {
  const positions = new Map<string, number>();

  levelGroups.forEach((stages, _level) => {
    let currentX = 0;

    stages.forEach((stage) => {
      positions.set(stage.id, currentX);
      currentX += config.nodeWidth + config.horizontalSpacing;
    });
  });

  return positions;
}

function createSBEConnections(
  flowStages: FlowStage[],
  dependencies: Map<string, string[]>,
  _positions: Map<string, FlowPosition>,
  connections: FlowConnection[],
): void {
  flowStages.forEach((stage) => {
    const producers = dependencies.get(stage.id) ?? [];

    producers.forEach((producerId) => {
      const connection: FlowConnection = {
        from: producerId,
        to: stage.id,
        dataVolume: 1,
        metrics: {
          nReturned: stage.sbeData?.slots?.consumed.length ?? 0,
          docsExamined: 0,
          keysExamined: 0,
        },
      };

      connections.push(connection);
    });
  });
}

function calculateSBEDimensions(
  positions: Map<string, FlowPosition>,
  config: LayoutConfig,
): { width: number; height: number } {
  if (positions.size === 0) {
    return { width: 0, height: 0 };
  }

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  positions.forEach((pos) => {
    minX = Math.min(minX, pos.x);
    maxX = Math.max(maxX, pos.x + config.nodeWidth);
    minY = Math.min(minY, pos.y);
    maxY = Math.max(maxY, pos.y + config.nodeHeight);
  });

  return {
    width: maxX - minX + config.containerPadding * 2,
    height: maxY - minY + config.containerPadding * 2,
  };
}

/**
 * TODO: Adjust node positions/edges based on ParsedSBEPlan/HybridSBEPlan
 * to reflect SBE-specific layout optimizations (e.g., slot-based grouping,
 * pipeline segment alignment). Currently returns the base layout unchanged.
 * Implement when SBE-specific visual distinctions are needed beyond the
 * standard tree layout.
 */
function enhanceLayoutForSBE(
  layout: FlowLayout,
  _sbePlan?: ParsedSBEPlan,
  _hybridPlan?: HybridSBEPlan,
): FlowLayout {
  return {
    ...layout,
  };
}
