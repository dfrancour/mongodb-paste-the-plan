/**
 * Stage Lookup Utilities
 *
 * Every lookup requires the caller to declare which layer it's asking about.
 * The string "COLLSCAN" is meaningless without context — it could be a planning
 * stage or a classic execution stage. The API enforces this.
 */

import type {
  StageDefinition,
  PipelineStageId,
  ExecutionStageId,
  PipelineStage,
  PlanningStage,
  ExecutionStage,
  MongosStage,
  EngineSupportMatrix,
  ExecutionEngine,
} from "./types";
import { QuerySolutionStageType, getEngineForStage } from "./types";

// Import all stages by layer
import * as pipelineStages from "./pipeline";
import * as planningStages from "./planning";
import * as sbeStages from "./execution/sbe";
import * as classicStages from "./execution/classic";
import * as mongosStages from "./mongos";

// ============================================================================
// nodeStageTypeToString map
// ============================================================================

/**
 * Maps QuerySolutionStageType → explain output string.
 * TypeScript equivalent of nodeStageTypeToString() in stage_types.cpp.
 *
 * Validated by source-validation tests against the C++ source.
 *
 * Note: STAGE_COLLSCAN conditionally produces "CLUSTERED_IXSCAN" based on
 * node properties — that case is handled as a separate planning stage.
 * STAGE_SORT_DEFAULT and STAGE_SORT_SIMPLE both produce "SORT".
 */
export const QUERY_SOLUTION_TYPE_TO_EXPLAIN_NAME: Record<
  QuerySolutionStageType,
  string
> = {
  [QuerySolutionStageType.STAGE_AND_HASH]: "AND_HASH",
  [QuerySolutionStageType.STAGE_AND_SORTED]: "AND_SORTED",
  [QuerySolutionStageType.STAGE_BATCHED_DELETE]: "BATCHED_DELETE",
  [QuerySolutionStageType.STAGE_CACHED_PLAN]: "CACHED_PLAN",
  [QuerySolutionStageType.STAGE_COLLSCAN]: "COLLSCAN",
  [QuerySolutionStageType.STAGE_VIRTUAL_SCAN]: "VIRTUAL_SCAN",
  [QuerySolutionStageType.STAGE_COUNT]: "COUNT",
  [QuerySolutionStageType.STAGE_COUNT_SCAN]: "COUNT_SCAN",
  [QuerySolutionStageType.STAGE_DELETE]: "DELETE",
  [QuerySolutionStageType.STAGE_DISTINCT_SCAN]: "DISTINCT_SCAN",
  [QuerySolutionStageType.STAGE_EOF]: "EOF",
  [QuerySolutionStageType.STAGE_FETCH]: "FETCH",
  [QuerySolutionStageType.STAGE_GEO_NEAR_2D]: "GEO_NEAR_2D",
  [QuerySolutionStageType.STAGE_GEO_NEAR_2DSPHERE]: "GEO_NEAR_2DSPHERE",
  [QuerySolutionStageType.STAGE_IDHACK]: "IDHACK",
  [QuerySolutionStageType.STAGE_IXSCAN]: "IXSCAN",
  [QuerySolutionStageType.STAGE_LIMIT]: "LIMIT",
  [QuerySolutionStageType.STAGE_MATCH]: "MATCH",
  [QuerySolutionStageType.STAGE_MOCK]: "MOCK",
  [QuerySolutionStageType.STAGE_MULTI_ITERATOR]: "MULTI_ITERATOR",
  [QuerySolutionStageType.STAGE_MULTI_PLAN]: "MULTI_PLAN",
  [QuerySolutionStageType.STAGE_OR]: "OR",
  [QuerySolutionStageType.STAGE_PROJECTION_DEFAULT]: "PROJECTION_DEFAULT",
  [QuerySolutionStageType.STAGE_PROJECTION_COVERED]: "PROJECTION_COVERED",
  [QuerySolutionStageType.STAGE_PROJECTION_SIMPLE]: "PROJECTION_SIMPLE",
  [QuerySolutionStageType.STAGE_QUEUED_DATA]: "QUEUED_DATA",
  [QuerySolutionStageType.STAGE_RECORD_STORE_FAST_COUNT]:
    "RECORD_STORE_FAST_COUNT",
  [QuerySolutionStageType.STAGE_REPLACE_ROOT]: "REPLACE_ROOT",
  [QuerySolutionStageType.STAGE_RETURN_KEY]: "RETURN_KEY",
  [QuerySolutionStageType.STAGE_SAMPLE_FROM_TIMESERIES_BUCKET]:
    "SAMPLE_FROM_TIMESERIES_BUCKET",
  [QuerySolutionStageType.STAGE_SHARDING_FILTER]: "SHARDING_FILTER",
  [QuerySolutionStageType.STAGE_SKIP]: "SKIP",
  [QuerySolutionStageType.STAGE_SORT_DEFAULT]: "SORT",
  [QuerySolutionStageType.STAGE_SORT_SIMPLE]: "SORT",
  [QuerySolutionStageType.STAGE_SORT_KEY_GENERATOR]: "SORT_KEY_GENERATOR",
  [QuerySolutionStageType.STAGE_SORT_MERGE]: "SORT_MERGE",
  [QuerySolutionStageType.STAGE_SPOOL]: "SPOOL",
  [QuerySolutionStageType.STAGE_SUBPLAN]: "SUBPLAN",
  [QuerySolutionStageType.STAGE_TEXT_OR]: "TEXT_OR",
  [QuerySolutionStageType.STAGE_TEXT_MATCH]: "TEXT_MATCH",
  [QuerySolutionStageType.STAGE_TIMESERIES_MODIFY]: "TIMESERIES_MODIFY",
  [QuerySolutionStageType.STAGE_TRIAL]: "TRIAL",
  [QuerySolutionStageType.STAGE_UNKNOWN]: "UNKNOWN",
  [QuerySolutionStageType.STAGE_UNPACK_SAMPLED_TS_BUCKET]:
    "UNPACK_SAMPLED_TS_BUCKET",
  [QuerySolutionStageType.STAGE_UNWIND]: "UNWIND",
  [QuerySolutionStageType.STAGE_UPDATE]: "UPDATE",
  [QuerySolutionStageType.STAGE_GROUP]: "GROUP",
  [QuerySolutionStageType.STAGE_EQ_LOOKUP]: "EQ_LOOKUP",
  [QuerySolutionStageType.STAGE_EQ_LOOKUP_UNWIND]: "EQ_LOOKUP_UNWIND",
  [QuerySolutionStageType.STAGE_SEARCH]: "SEARCH",
  [QuerySolutionStageType.STAGE_WINDOW]: "WINDOW",
  [QuerySolutionStageType.STAGE_SENTINEL]: "SENTINEL",
  [QuerySolutionStageType.STAGE_HASH_JOIN_EMBEDDING_NODE]:
    "HASH_JOIN_EMBEDDING",
  [QuerySolutionStageType.STAGE_NESTED_LOOP_JOIN_EMBEDDING_NODE]:
    "NESTED_LOOP_JOIN_EMBEDDING",
  [QuerySolutionStageType.STAGE_INDEXED_NESTED_LOOP_JOIN_EMBEDDING_NODE]:
    "INDEXED_NESTED_LOOP_JOIN_EMBEDDING",
  [QuerySolutionStageType.STAGE_INDEX_PROBE_NODE]: "INDEX_PROBE_NODE",
  [QuerySolutionStageType.STAGE_UNPACK_TS_BUCKET]: "UNPACK_TS_BUCKET",
};

// ============================================================================
// Layer-keyed stage store
// ============================================================================

/** Build a stage dictionary from a barrel-exported module namespace. */
function buildDict<T extends { id: string }>(
  modules: Record<string, T>,
): Record<string, T> {
  const dict: Record<string, T> = {};
  for (const stage of Object.values(modules)) {
    dict[stage.id] = stage;
  }
  return dict;
}

/**
 * All stage definitions, keyed by layer.
 *
 * Each layer has its own dictionary — no collisions, no guessing.
 * Planning and classic execution both use UPPER_CASE names, but they
 * live in separate dictionaries so there's no ambiguity.
 */
export const STAGES = {
  pipeline: buildDict<PipelineStage>(pipelineStages),
  planning: buildDict<PlanningStage>(planningStages),
  execution: {
    ...buildDict<ExecutionStage>(sbeStages),
    ...buildDict<ExecutionStage>(classicStages),
  },
  mongos: buildDict<MongosStage>(mongosStages),
} as const;

// ============================================================================
// Primary Lookup
// ============================================================================

/**
 * Look up a stage definition by layer and name.
 *
 * The caller must declare which layer they're asking about. The string
 * "COLLSCAN" means different things in different sections of explain output.
 *
 * @example
 * getStage("planning", "GROUP")      // → planning GROUP
 * getStage("execution", "group")     // → SBE group
 * getStage("execution", "COLLSCAN")  // → classic COLLSCAN
 * getStage("pipeline", "$match")     // → pipeline $match
 */
export function getStage(
  layer: "pipeline",
  name: string,
): PipelineStage | undefined;
export function getStage(
  layer: "planning",
  name: string,
): PlanningStage | undefined;
export function getStage(
  layer: "execution",
  name: string,
): ExecutionStage | undefined;
export function getStage(
  layer: "mongos",
  name: string,
): MongosStage | undefined;
export function getStage(
  layer: "pipeline" | "planning" | "execution" | "mongos",
  name: string,
): StageDefinition | undefined {
  return STAGES[layer][name];
}

// ============================================================================
// Enumeration
// ============================================================================

/**
 * Get all stages as an array (all layers).
 */
export function getAllStages(): StageDefinition[] {
  return [
    ...Object.values(STAGES.pipeline),
    ...Object.values(STAGES.planning),
    ...Object.values(STAGES.execution),
    ...Object.values(STAGES.mongos),
  ];
}

/**
 * Compute a unique anchor ID for a stage definition.
 * Needed because planning and classic execution stages share UPPER_CASE names.
 * Format: `classic-COLLSCAN`, `sbe-group`, `planning-GROUP`, `pipeline-$group`, `mongos-SHARD_MERGE`
 */
export function getStageAnchorId(stage: StageDefinition): string {
  if (stage.layer === "execution") {
    return `${stage.engine}-${stage.id}`;
  }
  return `${stage.layer}-${stage.id}`;
}

// ============================================================================
// Relationship Lookup Utilities
// ============================================================================

/**
 * Get all planning stage implementations for a given pipeline stage.
 *
 * Computes the reverse relationship: Pipeline ← planning stages built from it.
 * builtFromUserSyntax lives exclusively on planning stages.
 *
 * @example
 * const impls = getImplementations(StageIds.pipeline("$group"));
 * // Returns: [GROUP (planning)]
 */
export function getImplementations(
  pipelineStageId: PipelineStageId,
): PlanningStage[] {
  return Object.values(STAGES.planning).filter(
    (stage) => stage.builtFromUserSyntax?.includes(pipelineStageId) ?? false,
  );
}

/**
 * Get the pipeline stage that an execution stage was built from.
 *
 * Traverses the relationship chain:
 *   Execution → querySolutionStageType → Planning → builtFromUserSyntax → Pipeline
 *
 * @example
 * const pipelineStage = getPipelineStageFor(StageIds.execution("group"));
 * // Returns: $group stage definition (via GROUP planning stage)
 */
export function getPipelineStageFor(
  stageId: ExecutionStageId,
): PipelineStage | undefined {
  const stage = STAGES.execution[stageId as string];
  if (!stage) return undefined;

  if (stage.querySolutionStageType) {
    const explainName =
      QUERY_SOLUTION_TYPE_TO_EXPLAIN_NAME[stage.querySolutionStageType];
    const planningStage = STAGES.planning[explainName];
    if (planningStage?.builtFromUserSyntax?.[0]) {
      const pipelineStage =
        STAGES.pipeline[planningStage.builtFromUserSyntax[0] as string];
      if (pipelineStage) return pipelineStage;
    }
  }

  return undefined;
}

/**
 * Get all execution stages by engine type.
 */
export function getStagesByEngine(engine: ExecutionEngine): ExecutionStage[] {
  return Object.values(STAGES.execution).filter(
    (stage) => getEngineForStage(stage) === engine,
  );
}

/**
 * Get all stages that match a query solution stage type.
 * Returns both planning and execution stages.
 */
export function getStagesByQuerySolutionType(
  querySolutionType: QuerySolutionStageType,
): (PlanningStage | ExecutionStage)[] {
  const results: (PlanningStage | ExecutionStage)[] = [];
  for (const stage of Object.values(STAGES.planning)) {
    if (stage.querySolutionStageType === querySolutionType) {
      results.push(stage);
    }
  }
  for (const stage of Object.values(STAGES.execution)) {
    if (stage.querySolutionStageType === querySolutionType) {
      results.push(stage);
    }
  }
  return results;
}

/**
 * Compute engine support for a pipeline stage from its execution implementations.
 *
 * This is derived information - computes which engines have implementations
 * of a given pipeline stage.
 *
 * @example
 * const support = getEngineSupport(StageIds.pipeline("$group"));
 * // Returns: { sbe: "full", classic: "full" }
 */
export function getEngineSupport(
  pipelineStageId: PipelineStageId,
): EngineSupportMatrix {
  // Planning stages → their querySolutionStageTypes → execution stages with matching type
  const planningImpls = getImplementations(pipelineStageId);
  const planningTypes = new Set(
    planningImpls.map((s) => s.querySolutionStageType),
  );

  const matchingExecution = Object.values(STAGES.execution).filter(
    (s) =>
      s.querySolutionStageType !== undefined &&
      planningTypes.has(s.querySolutionStageType),
  );

  const hasSbe = matchingExecution.some((s) => getEngineForStage(s) === "sbe");
  const hasClassic = matchingExecution.some(
    (s) => getEngineForStage(s) === "classic",
  );

  return {
    sbe: hasSbe ? "full" : "none",
    classic: hasClassic ? "full" : "none",
  };
}
