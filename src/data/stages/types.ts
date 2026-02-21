/**
 * Type system for MongoDB execution stages
 *
 * Uses discriminated unions based on `layer` to enforce correctness:
 * - Pipeline: User-facing aggregation stages ($match, $group, etc.)
 * - Execution: Internal execution stages for SBE and Classic engines
 * - Mongos: Coordination stages that run on the mongos router
 */

// Import and re-export StageIconName from the single source of truth
import type { StageIconName } from "#lib/visualization/stageIcons";
export type { StageIconName };

// ============================================================================
// Query Solution Stage Types (Planning Layer)
// ============================================================================
// These correspond to the StageType enum in:
// src/mongo/db/query/compiler/physical_model/query_solution/stage_types.h

export enum QuerySolutionStageType {
  STAGE_AND_HASH = "STAGE_AND_HASH",
  STAGE_AND_SORTED = "STAGE_AND_SORTED",
  STAGE_BATCHED_DELETE = "STAGE_BATCHED_DELETE",
  STAGE_CACHED_PLAN = "STAGE_CACHED_PLAN",
  STAGE_COLLSCAN = "STAGE_COLLSCAN",
  STAGE_VIRTUAL_SCAN = "STAGE_VIRTUAL_SCAN",
  STAGE_COUNT = "STAGE_COUNT",
  STAGE_COUNT_SCAN = "STAGE_COUNT_SCAN",
  STAGE_DELETE = "STAGE_DELETE",
  STAGE_DISTINCT_SCAN = "STAGE_DISTINCT_SCAN",
  STAGE_EOF = "STAGE_EOF",
  STAGE_FETCH = "STAGE_FETCH",
  STAGE_GEO_NEAR_2D = "STAGE_GEO_NEAR_2D",
  STAGE_GEO_NEAR_2DSPHERE = "STAGE_GEO_NEAR_2DSPHERE",
  STAGE_IDHACK = "STAGE_IDHACK",
  STAGE_IXSCAN = "STAGE_IXSCAN",
  STAGE_LIMIT = "STAGE_LIMIT",
  STAGE_MATCH = "STAGE_MATCH",
  STAGE_MOCK = "STAGE_MOCK",
  STAGE_MULTI_ITERATOR = "STAGE_MULTI_ITERATOR",
  STAGE_MULTI_PLAN = "STAGE_MULTI_PLAN",
  STAGE_OR = "STAGE_OR",
  STAGE_PROJECTION_DEFAULT = "STAGE_PROJECTION_DEFAULT",
  STAGE_PROJECTION_COVERED = "STAGE_PROJECTION_COVERED",
  STAGE_PROJECTION_SIMPLE = "STAGE_PROJECTION_SIMPLE",
  STAGE_QUEUED_DATA = "STAGE_QUEUED_DATA",
  STAGE_RECORD_STORE_FAST_COUNT = "STAGE_RECORD_STORE_FAST_COUNT",
  STAGE_REPLACE_ROOT = "STAGE_REPLACE_ROOT",
  STAGE_RETURN_KEY = "STAGE_RETURN_KEY",
  STAGE_SAMPLE_FROM_TIMESERIES_BUCKET = "STAGE_SAMPLE_FROM_TIMESERIES_BUCKET",
  STAGE_SHARDING_FILTER = "STAGE_SHARDING_FILTER",
  STAGE_SKIP = "STAGE_SKIP",
  STAGE_SORT_DEFAULT = "STAGE_SORT_DEFAULT",
  STAGE_SORT_SIMPLE = "STAGE_SORT_SIMPLE",
  STAGE_SORT_KEY_GENERATOR = "STAGE_SORT_KEY_GENERATOR",
  STAGE_SORT_MERGE = "STAGE_SORT_MERGE",
  STAGE_SPOOL = "STAGE_SPOOL",
  STAGE_SUBPLAN = "STAGE_SUBPLAN",
  STAGE_TEXT_OR = "STAGE_TEXT_OR",
  STAGE_TEXT_MATCH = "STAGE_TEXT_MATCH",
  STAGE_TIMESERIES_MODIFY = "STAGE_TIMESERIES_MODIFY",
  STAGE_TRIAL = "STAGE_TRIAL",
  STAGE_UNKNOWN = "STAGE_UNKNOWN",
  STAGE_UNPACK_SAMPLED_TS_BUCKET = "STAGE_UNPACK_SAMPLED_TS_BUCKET",
  STAGE_UNWIND = "STAGE_UNWIND",
  STAGE_UPDATE = "STAGE_UPDATE",
  STAGE_GROUP = "STAGE_GROUP",
  STAGE_EQ_LOOKUP = "STAGE_EQ_LOOKUP",
  STAGE_EQ_LOOKUP_UNWIND = "STAGE_EQ_LOOKUP_UNWIND",
  STAGE_SEARCH = "STAGE_SEARCH",
  STAGE_WINDOW = "STAGE_WINDOW",
  STAGE_SENTINEL = "STAGE_SENTINEL",
  STAGE_HASH_JOIN_EMBEDDING_NODE = "STAGE_HASH_JOIN_EMBEDDING_NODE",
  STAGE_NESTED_LOOP_JOIN_EMBEDDING_NODE = "STAGE_NESTED_LOOP_JOIN_EMBEDDING_NODE",
  STAGE_INDEXED_NESTED_LOOP_JOIN_EMBEDDING_NODE = "STAGE_INDEXED_NESTED_LOOP_JOIN_EMBEDDING_NODE",
  STAGE_INDEX_PROBE_NODE = "STAGE_INDEX_PROBE_NODE",
  STAGE_UNPACK_TS_BUCKET = "STAGE_UNPACK_TS_BUCKET",
}

// ============================================================================
// Branded Stage IDs - Prevents mixing up IDs from different layers
// ============================================================================

type Brand<K, T> = K & { readonly __brand: T };

/** Branded ID for pipeline stages */
export type PipelineStageId = Brand<string, "PipelineStage">;

/** Branded ID for planning stages */
export type PlanningStageId = Brand<string, "PlanningStage">;

/** Branded ID for execution stages */
export type ExecutionStageId = Brand<string, "ExecutionStage">;

/** Branded ID for mongos stages */
export type MongosStageId = Brand<string, "MongosStage">;

/** Union of all stage ID types */
export type StageId =
  | PipelineStageId
  | PlanningStageId
  | ExecutionStageId
  | MongosStageId;

/** Helper to create branded IDs (only way to construct them safely) */
export const StageIds = {
  pipeline: (id: string) => id as PipelineStageId,
  planning: (id: string) => id as PlanningStageId,
  execution: (id: string) => id as ExecutionStageId,
  mongos: (id: string) => id as MongosStageId,
} as const;

// ============================================================================
// Stage Categories
// ============================================================================

export const StageCategory = {
  CollectionScan: "collectionScan",
  IndexScan: "indexScan",
  Fetch: "fetch",
  Aggregation: "aggregation",
  Transformation: "transformation",
  Sort: "sort",
  Join: "join",
  Filter: "filter",
  Geospatial: "geospatial",
  TextSearch: "textSearch",
  TimeSeries: "timeSeries",
  VectorSearch: "vectorSearch",
  Window: "window",
  Writes: "writes",
  QueryPlanning: "queryPlanning",
  SystemMetadata: "systemMetadata",
  Internal: "internal",
  Unknown: "unknown",
} as const;

export type StageCategory = (typeof StageCategory)[keyof typeof StageCategory];

// ============================================================================
// Execution Engine
// ============================================================================

export type ExecutionEngine = "sbe" | "classic";

/** Engine support level for a pipeline stage */
export type EngineSupportLevel = "full" | "none";

/** Matrix describing which engines support a pipeline stage */
export type EngineSupportMatrix = {
  readonly sbe: EngineSupportLevel;
  readonly classic: EngineSupportLevel;
};

// ============================================================================
// Shared Types
// ============================================================================

type BaseStageMetadata = {
  readonly fullName: string;
  readonly description: string;
  readonly category: StageCategory;
  readonly iconName: StageIconName;
  readonly performanceNotes?: string;
  readonly sourceFile?: string;
  readonly introducedIn?: string;
  readonly deprecatedIn?: string;
  readonly removedIn?: string;
  readonly docsUrl?: string;
  /** Analysis note shown when this stage appears (if any). Severity comes from category. */
  readonly analysisNote?: string;
  /** True if this stage indicates a covered query (data served entirely from index). */
  readonly isCoveredQueryIndicator?: boolean;
  /** True if this stage's children execute in parallel (e.g., shards). Affects self-time calculation. */
  readonly hasParallelChildren?: boolean;
};

type ExecutionCharacteristics = {
  readonly blockingStage: boolean;
  readonly canSpillToDisk: boolean;
};

// ============================================================================
// Stage Definition Types - Discriminated Union
// ============================================================================

/**
 * Pipeline stages are user-facing aggregation stages.
 * These appear in the `stages` array of aggregation explain output.
 *
 * Examples: $match, $group, $project, $lookup
 */
export type PipelineStage = BaseStageMetadata & {
  readonly layer: "pipeline";
  readonly id: PipelineStageId;
  readonly executionCharacteristics?: ExecutionCharacteristics;
};

/**
 * Planning stages represent nodes in the QuerySolution tree.
 * These appear in the `queryPlanner.winningPlan.queryPlan` section of explain output.
 * Each corresponds to a QuerySolutionNode subclass in query_solution.h.
 *
 * Planning stages describe WHAT the planner decided and WHY it matters.
 * Execution stages describe HOW a specific engine implements it.
 *
 * Examples: GROUP, COLLSCAN, IXSCAN, MATCH, FETCH
 */
export type PlanningStage = BaseStageMetadata &
  ExecutionCharacteristics & {
    readonly layer: "planning";
    readonly id: PlanningStageId;
    readonly querySolutionStageType: QuerySolutionStageType;
    /** Pipeline stage(s) this planning stage is an optimized form of */
    readonly builtFromUserSyntax?: readonly PipelineStageId[];
  };

/**
 * Execution stages are internal implementation stages.
 * These appear in the `executionStats.executionStages` section of explain output.
 *
 * The `engine` field distinguishes between SBE and Classic execution:
 * - "sbe": Slot-Based Execution engine stages (scan, hash_agg, etc.)
 * - "classic": Classic engine stages (COLLSCAN, IXSCAN, etc.)
 */
export type ExecutionStage = BaseStageMetadata &
  ExecutionCharacteristics & {
    readonly layer: "execution";
    readonly id: ExecutionStageId;
    readonly engine: ExecutionEngine;
    readonly querySolutionStageType?: QuerySolutionStageType;
  };

/**
 * Mongos stages are coordination stages that run on the mongos router.
 * These appear in sharded cluster explain output, wrapping the per-shard
 * execution plans.
 *
 * Examples: SINGLE_SHARD, SHARD_MERGE, SHARD_MERGE_SORT, SHARD_WRITE
 */
export type MongosStage = BaseStageMetadata &
  ExecutionCharacteristics & {
    readonly layer: "mongos";
    readonly id: MongosStageId;
  };

/** Union of all stage types */
export type StageDefinition =
  | PipelineStage
  | PlanningStage
  | ExecutionStage
  | MongosStage;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a stage is a pipeline stage
 */
export function isPipelineStage(
  stage: StageDefinition,
): stage is PipelineStage {
  return stage.layer === "pipeline";
}

/**
 * Type guard to check if a stage is a planning stage
 */
export function isPlanningStage(
  stage: StageDefinition,
): stage is PlanningStage {
  return stage.layer === "planning";
}

/**
 * Type guard to check if a stage is an execution stage
 */
export function isExecutionStage(
  stage: StageDefinition,
): stage is ExecutionStage {
  return stage.layer === "execution";
}

/**
 * Type guard to check if a stage is an SBE execution stage
 */
export function isSbeStage(
  stage: StageDefinition,
): stage is ExecutionStage & { engine: "sbe" } {
  return isExecutionStage(stage) && stage.engine === "sbe";
}

/**
 * Type guard to check if a stage is a Classic execution stage
 */
export function isClassicStage(
  stage: StageDefinition,
): stage is ExecutionStage & { engine: "classic" } {
  return isExecutionStage(stage) && stage.engine === "classic";
}

/**
 * Type guard to check if a stage is a mongos coordination stage
 */
export function isMongosStage(stage: StageDefinition): stage is MongosStage {
  return stage.layer === "mongos";
}

/**
 * Get the execution engine for a stage.
 */
export function getEngineForStage(stage: ExecutionStage): ExecutionEngine {
  return stage.engine;
}
