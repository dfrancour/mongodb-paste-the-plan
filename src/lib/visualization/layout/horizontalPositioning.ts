import type { NormalizedStage } from "#types/explain-plan";
import type { LayoutConfig } from "./config";
import { StageCategory } from "#data/stages";

/**
 * Calculate horizontal (X-axis) positions within each level.
 * Handles merge grouping and sort priority for consistent layout.
 */
export function calculateHorizontalPositions(
  levelGroups: Map<number, NormalizedStage[]>,
  config: LayoutConfig,
): Map<string, number> {
  const positions = new Map<string, number>();

  levelGroups.forEach((stages, _level) => {
    const mergeGroups = groupStagesByMergeRelationship(stages);

    let currentX = 0;

    mergeGroups.forEach((group) => {
      if (group.length === 1) {
        const stage = group[0];
        if (stage) {
          positions.set(stage.id, currentX);
          currentX += config.nodeWidth + config.horizontalSpacing;
        }
      } else {
        let maxGroupWidth = config.nodeWidth;
        const groupPositions: Array<{
          stage: NormalizedStage;
          width: number;
        }> = [];

        group.forEach((stage) => {
          const nodeWidth = config.nodeWidth;
          maxGroupWidth = Math.max(maxGroupWidth, nodeWidth);
          groupPositions.push({ stage, width: nodeWidth });
        });

        groupPositions.forEach(({ stage }, index) => {
          const x =
            currentX + index * (maxGroupWidth + config.horizontalSpacing);
          positions.set(stage.id, x);
        });

        currentX +=
          group.length * maxGroupWidth +
          (group.length - 1) * config.horizontalSpacing +
          config.horizontalSpacing * 2;
      }
    });
  });

  return positions;
}

function groupStagesByMergeRelationship(
  stages: NormalizedStage[],
): NormalizedStage[][] {
  const groups: NormalizedStage[][] = [];
  const processed = new Set<string>();

  stages.forEach((stage) => {
    if (processed.has(stage.id)) return;

    const mergeStages = findMergeGroup(stage, stages);

    if (mergeStages.length > 1) {
      const sortedMerge = mergeStages.sort((a, b) => {
        return getLayoutSortPriority(a) - getLayoutSortPriority(b);
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

function getLayoutSortPriority(stage: NormalizedStage): number {
  switch (stage.category) {
    case StageCategory.CollectionScan:
      return 0;
    case StageCategory.IndexScan:
      return 10;
    case StageCategory.Fetch:
      return 20;
    case StageCategory.QueryPlanning:
    case StageCategory.Internal:
      return 30;
    default:
      return 50;
  }
}

function findMergeGroup(
  stage: NormalizedStage,
  allStages: NormalizedStage[],
): NormalizedStage[] {
  const siblingsWithSameParent = allStages.filter((s) => {
    return s.depth === stage.depth && shareCommonParent(s, stage);
  });

  return siblingsWithSameParent.length > 1 ? siblingsWithSameParent : [stage];
}

function shareCommonParent(
  stage1: NormalizedStage,
  stage2: NormalizedStage,
): boolean {
  const path1Parts = stage1.id.split(".");
  const path2Parts = stage2.id.split(".");

  if (path1Parts.length !== path2Parts.length) return false;

  const parentPath1 = path1Parts.slice(0, -1).join(".");
  const parentPath2 = path2Parts.slice(0, -1).join(".");

  return parentPath1 === parentPath2;
}
