/**
 * Extract execution metrics from a raw stage.
 * Only used when normalizing execution stages (not plan stages).
 *
 * Single extraction path: typed well-known fields first, then stage-specific
 * fields from explainFields declarations. Everything lands in one metrics object.
 */
import type { NormalizedExecutionStage } from "#types/explain-plan";
import type { ExplainStage, WinningPlan } from "#types/explain-plan";
import type { StageDefinition } from "#data/stages/types";
import { hasExplainFields } from "#data/stages/fields/field_utilities";
import { getNumericProperty } from "#lib/utils/jsxUtils";
import { CLASSIC_COMMON_FIELDS, SBE_COMMON_FIELDS } from "#data/stages/fields";

/**
 * bsonKeys from engine common field declarations.
 * Used to deduplicate: if a stage's explainFields re-declares a common field,
 * the typed extraction above takes precedence.
 *
 * Generated from declarations so adding a new common field automatically
 * prevents duplicate extraction without updating this module.
 */
const COMMON_FIELD_KEYS: ReadonlySet<string> = new Set([
  ...CLASSIC_COMMON_FIELDS.map((f) => f.bsonKey),
  ...SBE_COMMON_FIELDS.map((f) => f.bsonKey),
]);

export type ExecutionMetrics = NormalizedExecutionStage["metrics"];

export function extractMetrics(
  stage: ExplainStage | WinningPlan,
  definition?: StageDefinition,
): ExecutionMetrics {
  const metrics: ExecutionMetrics = {
    nReturned: getNumericProperty(stage, "nReturned"),
    docsExamined:
      getNumericProperty(stage, "docsExamined") ??
      getNumericProperty(stage, "totalDocsExamined"),
    keysExamined:
      getNumericProperty(stage, "keysExamined") ??
      getNumericProperty(stage, "totalKeysExamined"),
    executionTimeMillis:
      getNumericProperty(stage, "executionTimeMillis") ??
      getNumericProperty(stage, "executionTimeMillisEstimate"),
    works: getNumericProperty(stage, "works"),
    advanced: getNumericProperty(stage, "advanced"),
    needTime: getNumericProperty(stage, "needTime"),
    needYield: getNumericProperty(stage, "needYield"),
    saveState: getNumericProperty(stage, "saveState"),
    restoreState: getNumericProperty(stage, "restoreState"),
    memLimit: getNumericProperty(stage, "memLimit"),
    totalDataSizeSorted: getNumericProperty(stage, "totalDataSizeSorted"),
    totalDataSizeSortedBytesEstimate: getNumericProperty(
      stage,
      "totalDataSizeSortedBytesEstimate",
    ),
    usedDisk:
      "usedDisk" in stage && typeof stage.usedDisk === "boolean"
        ? stage.usedDisk
        : undefined,
    seeks: getNumericProperty(stage, "seeks"),
    dupsTested: getNumericProperty(stage, "dupsTested"),
    dupsDropped: getNumericProperty(stage, "dupsDropped"),
    alreadyHasObj: getNumericProperty(stage, "alreadyHasObj"),
  };

  // Extract stage-specific fields from explainFields declarations.
  // Skip fields already extracted as typed properties or declared in engine common fields.
  if (definition && hasExplainFields(definition) && definition.explainFields) {
    for (const field of definition.explainFields) {
      if (field.verbosity !== "executionStats") continue;
      const key = field.bsonKey;
      if (key in metrics || COMMON_FIELD_KEYS.has(key)) continue;

      if (key in stage) {
        const value = (stage as Record<string, unknown>)[key];
        if (
          typeof value === "number" ||
          typeof value === "boolean" ||
          typeof value === "string"
        ) {
          metrics[key] = value;
        }
      }
    }
  }

  return metrics;
}

export function calculateEfficiency(
  metrics: ExecutionMetrics,
): { documentEfficiency?: number; indexEfficiency?: number } | undefined {
  if (
    metrics.nReturned !== undefined &&
    metrics.docsExamined !== undefined &&
    metrics.docsExamined > 0
  ) {
    const efficiency: {
      documentEfficiency?: number;
      indexEfficiency?: number;
    } = {
      documentEfficiency: metrics.nReturned / metrics.docsExamined,
    };
    if (metrics.keysExamined !== undefined && metrics.keysExamined > 0) {
      efficiency.indexEfficiency = metrics.nReturned / metrics.keysExamined;
    }
    return efficiency;
  }
  return undefined;
}
