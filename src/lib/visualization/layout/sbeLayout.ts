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
          .map(([stageId, _]) =>
            Math.max(
              stageHeights.get(stageId) ?? config.nodeHeight,
              config.nodeHeight,
            ),
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
    nodeIdToStageId.set(nodeId, stage.id);
  });

  const queryPlanDependencies = extractQueryPlanDependencies(sbePlan);

  flowStages.forEach((stage) => {
    const nodeId = extractNodeIdFromStageId(stage.id);
    const dependentNodeIds = queryPlanDependencies.get(nodeId) ?? [];

    const stageDependencies = dependentNodeIds
      .map((depNodeId) => nodeIdToStageId.get(depNodeId))
      .filter((stageId): stageId is string => Boolean(stageId));

    dependencies.set(stage.id, stageDependencies);
  });

  return dependencies;
}

function extractQueryPlanDependencies(
  sbePlan: ParsedSBEPlan,
): Map<number, number[]> {
  const dependencies = new Map<number, number[]>();

  const nodeIds = Array.from(sbePlan.queryPlanStages.keys()).sort(
    (a, b) => a - b,
  );

  nodeIds.forEach((nodeId) => {
    const stageName = sbePlan.queryPlanStages.get(nodeId);

    if (!stageName) {
      dependencies.set(nodeId, []);
      return;
    }

    switch (stageName) {
      case "IXSCAN":
        dependencies.set(nodeId, []);
        break;

      case "OR":
      case "AND_HASH":
      case "UNION": {
        const ixscanNodeIds = nodeIds.filter(
          (id) => id < nodeId && sbePlan.queryPlanStages.get(id) === "IXSCAN",
        );
        dependencies.set(nodeId, ixscanNodeIds);
        break;
      }

      case "FETCH": {
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
      }

      case "TEXT_MATCH":
      case "SORT":
      case "LIMIT":
      case "PROJECTION_DEFAULT": {
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
      }

      default: {
        const prevNodeId = nodeIds.find((id) => id === nodeId - 1);
        dependencies.set(nodeId, prevNodeId !== undefined ? [prevNodeId] : []);
        break;
      }
    }
  });

  return dependencies;
}

function extractNodeIdFromStageId(stageId: string): number {
  const match = /sbe_node_(\d+)/.exec(stageId);
  return match?.[1] ? parseInt(match[1], 10) : 0;
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
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  positions.forEach((pos, _stageId) => {
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

function enhanceLayoutForSBE(
  layout: FlowLayout,
  _sbePlan?: ParsedSBEPlan,
  _hybridPlan?: HybridSBEPlan,
): FlowLayout {
  return {
    ...layout,
  };
}
