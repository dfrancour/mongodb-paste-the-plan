/**
 * Create synthetic SHARD_EXECUTION nodes from the shards array
 * in a SHARD_MERGE stage. Supports both plan and execution modes.
 */
import type {
  PlanStage,
  ExecutionStage,
  NormalizedPlanStage,
  NormalizedExecutionStage,
} from "#types/explain-plan";
import { isExecutionStage } from "#lib/utils/jsxUtils";
import { getStage, StageCategory } from "#data/stages";

/**
 * Expand shards array into SHARD_EXECUTION children for plan normalization.
 * Each shard entry at plan level has `shardName` and `winningPlan`.
 */
export function expandShardsForPlan(
  shards: unknown[],
  depth: number,
  path: string,
  normalizePlan: (
    stage: PlanStage,
    depth: number,
    path: string,
  ) => NormalizedPlanStage,
): NormalizedPlanStage[] {
  const children: NormalizedPlanStage[] = [];

  shards.forEach((shard, index) => {
    if (
      !shard ||
      typeof shard !== "object" ||
      !("winningPlan" in shard) ||
      !shard.winningPlan ||
      typeof shard.winningPlan !== "object"
    ) {
      return;
    }

    const shardRecord = shard as Record<string, unknown>;
    const shardName =
      typeof shardRecord.shardName === "string"
        ? shardRecord.shardName
        : `shard${index}`;

    const shardDefinition = getStage("mongos", "SHARD_EXECUTION");

    const shardChild = normalizePlan(
      shardRecord.winningPlan as PlanStage,
      depth + 2,
      `${path}.shard.${index}.plan`,
    );

    const shardNode: NormalizedPlanStage = {
      id: `${path}.shard.${index}`,
      stage: "SHARD_EXECUTION",
      category: shardDefinition?.category ?? StageCategory.Internal,
      iconName: shardDefinition?.iconName ?? "Server",
      definition: shardDefinition,
      structure: {},
      shardName,
      children: [shardChild],
      depth: depth + 1,
    };

    children.push(shardNode);
  });

  return children;
}

/**
 * Expand shards array into SHARD_EXECUTION children for execution normalization.
 * Each shard entry at execution level has `shardName`, metrics, and `executionStages`.
 */
export function expandShardsForExecution(
  shards: unknown[],
  depth: number,
  path: string,
  normalizeExecution: (
    stage: ExecutionStage,
    depth: number,
    path: string,
  ) => NormalizedExecutionStage,
): NormalizedExecutionStage[] {
  const children: NormalizedExecutionStage[] = [];

  shards.forEach((shard, index) => {
    if (
      !shard ||
      typeof shard !== "object" ||
      !("executionStages" in shard) ||
      !isExecutionStage((shard as Record<string, unknown>).executionStages)
    ) {
      return;
    }

    const shardRecord = shard as Record<string, unknown>;
    const shardName =
      typeof shardRecord.shardName === "string"
        ? shardRecord.shardName
        : `shard${index}`;
    const executionSuccess =
      typeof shardRecord.executionSuccess === "boolean"
        ? shardRecord.executionSuccess
        : undefined;

    const shardDefinition = getStage("mongos", "SHARD_EXECUTION");

    const shardChild = normalizeExecution(
      shardRecord.executionStages as ExecutionStage,
      depth + 2,
      `${path}.shard.${index}.exec`,
    );

    const shardNode: NormalizedExecutionStage = {
      id: `${path}.shard.${index}`,
      stage: "SHARD_EXECUTION",
      category: shardDefinition?.category ?? StageCategory.Internal,
      iconName: shardDefinition?.iconName ?? "Server",
      definition: shardDefinition,
      structure: {},
      shardName,
      executionSuccess,
      metrics: {
        executionTimeMillis:
          typeof shardRecord.executionTimeMillis === "number"
            ? shardRecord.executionTimeMillis
            : undefined,
        nReturned:
          typeof shardRecord.nReturned === "number"
            ? shardRecord.nReturned
            : undefined,
        docsExamined:
          typeof shardRecord.totalDocsExamined === "number"
            ? shardRecord.totalDocsExamined
            : undefined,
        keysExamined:
          typeof shardRecord.totalKeysExamined === "number"
            ? shardRecord.totalKeysExamined
            : undefined,
      },
      children: [shardChild],
      depth: depth + 1,
    };

    children.push(shardNode);
  });

  return children;
}
