/**
 * Extract StageStructure from a raw stage.
 * Shared between plan and execution normalization.
 */
import type { StageStructure } from "#types/explain-plan";
import type { ExplainStage, WinningPlan } from "#types/explain-plan";
import { getNumericProperty, getStringProperty } from "#lib/utils/jsxUtils";

export function extractStructure(
  stage: ExplainStage | WinningPlan,
): StageStructure {
  return {
    indexName: getStringProperty(stage, "indexName"),
    direction: getStringProperty(stage, "direction"),
    filter: "filter" in stage ? stage.filter : undefined,
    indexBounds: "indexBounds" in stage ? stage.indexBounds : undefined,
    keyPattern: "keyPattern" in stage ? stage.keyPattern : undefined,
    sortPattern: "sortPattern" in stage ? stage.sortPattern : undefined,
    limitAmount: getNumericProperty(stage, "limitAmount"),
    sort: "sort" in stage ? stage.sort : undefined,
    limit:
      "limit" in stage
        ? ((stage as Record<string, unknown>).limit as number | undefined)
        : undefined,
    skip:
      "skip" in stage
        ? ((stage as Record<string, unknown>).skip as number | undefined)
        : undefined,
    projection: "projection" in stage ? stage.projection : undefined,
  };
}
