/**
 * Extract StageStructure from a raw stage.
 * Shared between plan and execution normalization.
 */
import type { StageStructure } from "#types/explain-plan";
import type { ExplainStage, WinningPlan } from "#types/explain-plan";
import {
  getNumericProperty,
  getStringProperty,
  getBooleanProperty,
} from "#lib/utils/jsxUtils";

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
    memLimit: getNumericProperty(stage, "memLimit"),
    type: getStringProperty(stage, "type"),
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
    collation: "collation" in stage ? stage.collation : undefined,
    isMultiKey: getBooleanProperty(stage, "isMultiKey"),
    multiKeyPaths: "multiKeyPaths" in stage ? stage.multiKeyPaths : undefined,
    isUnique: getBooleanProperty(stage, "isUnique"),
    isSparse: getBooleanProperty(stage, "isSparse"),
    isPartial: getBooleanProperty(stage, "isPartial"),
    indexVersion: getNumericProperty(stage, "indexVersion"),
  };
}
