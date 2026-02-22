import { z } from "zod";
import type { StageDefinition, StageCategory } from "#data/stages/types";

// ============================================================================
// PHASE 1: Separate Type Hierarchies for Plan vs Execution
// ============================================================================

// Structural fields common to both plan and execution stages
const structuralStageFieldsSchema = z
  .object({
    stage: z.string().optional(),
    planNodeId: z.number().optional(),
    direction: z.string().optional(),
    indexName: z.string().optional(),
    indexBounds: z.record(z.string(), z.unknown()).optional(),
    keyPattern: z.record(z.string(), z.unknown()).optional(),
    multiKeyPaths: z.record(z.string(), z.unknown()).optional(),
    isMultiKey: z.boolean().optional(),
    isUnique: z.boolean().optional(),
    isSparse: z.boolean().optional(),
    isPartial: z.boolean().optional(),
    indexVersion: z.number().optional(),
    filter: z.unknown().optional(),
    transformBy: z.record(z.string(), z.unknown()).optional(),
    sortPattern: z.record(z.string(), z.unknown()).optional(),
    limitAmount: z.number().optional(),
    projections: z.record(z.string(), z.unknown()).optional(),
    shardName: z.string().optional(),
    connectionString: z.string().optional(),
    outerStage: z.unknown().optional(),
    innerStage: z.unknown().optional(),
    outputSlots: z.array(z.number()).optional(),
  })
  .loose();

// Execution-only metrics (NOT present in queryPlanner.winningPlan)
const executionMetricsSchema = z.object({
  totalDocsExamined: z.number().optional(),
  totalKeysExamined: z.number().optional(),
  docsExamined: z.number().optional(),
  keysExamined: z.number().optional(),
  nReturned: z.number().optional(),
  executionTimeMillis: z.number().optional(),
  executionTimeMillisEstimate: z.number().optional(),
  works: z.number().optional(),
  advanced: z.number().optional(),
  needTime: z.number().optional(),
  needYield: z.number().optional(),
  saveState: z.number().optional(),
  restoreState: z.number().optional(),
  isEOF: z.number().optional(),
  invalidates: z.number().optional(),
  alreadyHasObj: z.number().optional(),
  seeks: z.number().optional(),
  dupsTested: z.number().optional(),
  dupsDropped: z.number().optional(),
  opens: z.number().optional(),
  closes: z.number().optional(),
  memLimit: z.number().optional(),
  totalDataSizeSorted: z.number().optional(),
  totalDataSizeSortedBytesEstimate: z.number().optional(),
  usedDisk: z.boolean().optional(),
  collectionScans: z.number().optional(),
  numTested: z.number().optional(),
});

// Plan stage schema (queryPlanner.winningPlan) - NO execution metrics
const planStageSchema = structuralStageFieldsSchema.loose();

// Execution stage schema (executionStats.executionStages) - WITH execution metrics
const executionStageSchema = structuralStageFieldsSchema
  .merge(executionMetricsSchema)
  .loose();

// ============================================================================
// Recursive schemas for Plan and Execution stages
// ============================================================================

// Forward declaration types for recursive schemas
type PlanStageType = z.infer<typeof planStageSchema> & {
  [x: string]: unknown;
  inputStage?: PlanStageType;
  inputStages?: PlanStageType[];
  shards?: Array<{
    shardName: string;
    connectionString?: string;
    executionStages?: ExecutionStageType;
    executionSuccess?: boolean;
    nReturned?: number;
    executionTimeMillis?: number;
    totalKeysExamined?: number;
    totalDocsExamined?: number;
  }>;
  sort?: unknown;
  limit?: number;
  skip?: number;
  projection?: unknown;
};

type ExecutionStageType = z.infer<typeof executionStageSchema> & {
  [x: string]: unknown;
  inputStage?: ExecutionStageType;
  inputStages?: ExecutionStageType[];
  shards?: Array<{
    shardName: string;
    connectionString?: string;
    executionStages?: ExecutionStageType;
    executionSuccess?: boolean;
    nReturned?: number;
    executionTimeMillis?: number;
    totalKeysExamined?: number;
    totalDocsExamined?: number;
  }>;
};

// Shard execution data schema
const shardExecutionDataSchema: z.ZodType<{
  shardName: string;
  connectionString?: string;
  executionStages?: ExecutionStageType;
  executionSuccess?: boolean;
  nReturned?: number;
  executionTimeMillis?: number;
  totalKeysExamined?: number;
  totalDocsExamined?: number;
}> = z.object({
  shardName: z.string(),
  connectionString: z.string().optional(),
  executionStages: z.lazy(() => explainStageSchema).optional(),
  executionSuccess: z.boolean().optional(),
  nReturned: z.number().optional(),
  executionTimeMillis: z.number().optional(),
  totalKeysExamined: z.number().optional(),
  totalDocsExamined: z.number().optional(),
});

// Plan stage schema (recursive) - queryPlanner.winningPlan
// NOTE: The .loose() preserves unknown fields beyond the type definition
export const planStageRecursiveSchema: z.ZodType<PlanStageType> =
  planStageSchema
    .extend({
      inputStage: z.lazy(() => planStageRecursiveSchema).optional(),
      inputStages: z.array(z.lazy(() => planStageRecursiveSchema)).optional(),
      shards: z.array(shardExecutionDataSchema).optional(),
      sort: z.unknown().optional(),
      limit: z.number().optional(),
      skip: z.number().optional(),
      projection: z.unknown().optional(),
    })
    .loose();

// Execution stage schema (recursive) - executionStats.executionStages
// NOTE: The .loose() preserves unknown fields beyond the type definition
export const executionStageRecursiveSchema: z.ZodType<ExecutionStageType> =
  executionStageSchema
    .extend({
      inputStage: z.lazy(() => executionStageRecursiveSchema).optional(),
      inputStages: z
        .array(z.lazy(() => executionStageRecursiveSchema))
        .optional(),
      shards: z.array(shardExecutionDataSchema).optional(),
    })
    .loose();

// Legacy schemas - kept as aliases for parser compatibility
export const explainStageSchema = executionStageRecursiveSchema;
export const winningPlanSchema = planStageRecursiveSchema;

// Plan execution statistics schema for allPlansExecution
export const planExecutionStatsSchema = z
  .object({
    nReturned: z.number().optional(),
    executionTimeMillisEstimate: z.number().optional(),
    totalKeysExamined: z.number().optional(),
    totalDocsExamined: z.number().optional(),
    executionStages: explainStageSchema.optional(),
    score: z.number().optional(), // Plan performance score
  })
  .loose();

// Plan comparison result for analysis
export const planComparisonSchema = z
  .object({
    planType: z.enum(["winning", "rejected"]),
    efficiency: z
      .object({
        selectivity: z.number().optional(), // nReturned / totalDocsExamined
        keyEfficiency: z.number().optional(), // nReturned / totalKeysExamined
        timePerDoc: z.number().optional(), // executionTimeMillis / nReturned
        productivity: z.number().optional(), // advanced / works (MongoDB's core metric)
      })
      .loose(),
    metrics: z
      .object({
        nReturned: z.number().optional(),
        totalKeysExamined: z.number().optional(),
        totalDocsExamined: z.number().optional(),
        works: z.number().optional(), // Total work units performed
        advanced: z.number().optional(), // Documents advanced to next stage
        executionTimeMillis: z.number().optional(),
      })
      .loose(),
    indexName: z.string().optional(),
    stages: z.array(z.string()).optional(),
    score: z.number().optional(), // Plan performance score
    eofBonus: z.boolean().optional(), // +1.0 bonus for reaching EOF (all documents retrieved)
    tieBreakers: z
      .object({
        noFetch: z.boolean(), // +ε bonus for covered queries
        noSort: z.boolean(), // +ε bonus for indexed sorts
        noIntersection: z.boolean(), // +ε bonus for single index usage
      })
      .loose()
      .optional(),
  })
  .loose();

// Shard execution data for sharded queries
export interface ShardExecutionData {
  shardName: string;
  connectionString?: string;
  executionStages?: ExplainStage;
  executionSuccess?: boolean;
  nReturned?: number;
  executionTimeMillis?: number;
  totalKeysExamined?: number;
  totalDocsExamined?: number;
}

// ============================================================================
// Type definitions for Plan vs Execution stages
// ============================================================================

// PlanStage: Structural representation from queryPlanner.winningPlan (NO metrics)
// Uses forward-declared type to support loose fields with index signature
export type PlanStage = PlanStageType;

// ExecutionStage: Full execution data from executionStats.executionStages (WITH metrics)
// Uses forward-declared type to support loose fields with index signature
export type ExecutionStage = ExecutionStageType;

// Type aliases for parser - ExplainStage and WinningPlan are clearer names
// in parsing context than ExecutionStage and PlanStage
export type ExplainStage = ExecutionStage;
export type WinningPlan = PlanStage;

// SBE (Slot-Based Execution) plan schema
export const slotBasedPlanSchema = z
  .object({
    slots: z.string(),
    stages: z.string(),
  })
  .loose();

// Winning plan schema with SBE support (avoiding circular reference)
export const winningPlanWithSbeSchema: z.ZodType<WinningPlanWithSbe> =
  executionStageSchema.extend({
    inputStage: z.lazy(() => winningPlanWithSbeSchema).optional(),
    inputStages: z.array(z.lazy(() => winningPlanWithSbeSchema)).optional(),
    shards: z.array(shardExecutionDataSchema).optional(),
    sort: z.unknown().optional(),
    limit: z.number().optional(),
    skip: z.number().optional(),
    projection: z.unknown().optional(),
    slotBasedPlan: slotBasedPlanSchema.optional(),
  });

// SBE aggregation stage schema (for explainVersion: "2")
// Use a flexible schema that allows both $cursor stages and other aggregation stages
export const sbeAggregationStageSchema = z
  .object({
    // $cursor stage fields (for first stage)
    $cursor: z
      .object({
        queryPlanner: z
          .object({
            plannerVersion: z.number().optional(),
            namespace: z.string().optional(),
            indexFilterSet: z.boolean().optional(),
            parsedQuery: z.record(z.string(), z.unknown()).optional(),
            queryHash: z.string().optional(),
            planCacheKey: z.string().optional(),
            planCacheShapeHash: z.string().optional(),
            maxIndexedOrSolutionsReached: z.boolean().optional(),
            maxIndexedAndSolutionsReached: z.boolean().optional(),
            maxScansToExplodeReached: z.boolean().optional(),
            winningPlan: z
              .object({
                queryPlan: winningPlanSchema.optional(),
                slotBasedPlan: slotBasedPlanSchema.optional(),
                isCached: z.boolean().optional(),
              })
              .loose()
              .optional(),
            rejectedPlans: z.array(winningPlanSchema).optional(),
          })
          .loose()
          .optional(),
        executionStats: z
          .object({
            executionSuccess: z.boolean().optional(),
            nReturned: z.number().optional(),
            executionTimeMillis: z.number().optional(),
            totalKeysExamined: z.number().optional(),
            totalDocsExamined: z.number().optional(),
            executionStages: explainStageSchema.optional(),
            allPlansExecution: z.array(planExecutionStatsSchema).optional(),
          })
          .optional(),
      })
      .optional(),
    // Common fields for all aggregation stages
    nReturned: z.number().optional(),
    executionTimeMillisEstimate: z.number().optional(),
    // Allow any other aggregation stage fields dynamically
  })
  .catchall(z.unknown());

// Sharded find query schemas
const shardedFindShardSchema = z
  .object({
    shardName: z.string(),
    connectionString: z.string().optional(),
    serverInfo: z.record(z.string(), z.unknown()).optional(),
    plannerVersion: z.number().optional(),
    namespace: z.string().optional(),
    indexFilterSet: z.boolean().optional(),
    parsedQuery: z.record(z.string(), z.unknown()).optional(),
    winningPlan: winningPlanSchema.optional(),
    rejectedPlans: z.array(winningPlanSchema).optional(),
    executionStages: explainStageSchema.optional(),
    executionSuccess: z.boolean().optional(),
    nReturned: z.number().optional(),
    executionTimeMillis: z.number().optional(),
    totalKeysExamined: z.number().optional(),
    totalDocsExamined: z.number().optional(),
  })
  .loose();

const shardedFindPlanSchema = z
  .object({
    // SBE format (explainVersion: "2") - aggregation pipelines
    stages: z.array(sbeAggregationStageSchema).optional(),
    // Legacy sharded aggregation detection (for error handling)
    shards: z
      .record(
        z.string(),
        z
          .object({
            host: z.string(),
            stages: z.array(z.unknown()).optional(),
          })
          .loose(),
      )
      .optional(),
    serverInfo: z.record(z.string(), z.unknown()).optional(),
    serverParameters: z.record(z.string(), z.unknown()).optional(),
    command: z.record(z.string(), z.unknown()).optional(),
    queryShapeHash: z.string().optional(),
    queryPlanner: z
      .object({
        mongosPlannerVersion: z.number().optional(),
        optimizationTimeMillis: z.number().optional(),
        maxIndexedOrSolutionsReached: z.boolean().optional(),
        maxIndexedAndSolutionsReached: z.boolean().optional(),
        maxScansToExplodeReached: z.boolean().optional(),
        prunedSimilarIndexes: z.boolean().optional(),
        indexFilterSet: z.boolean().optional(),
        queryHash: z.string().optional(),
        planCacheKey: z.string().optional(),
        planCacheShapeHash: z.string().optional(),
        winningPlan: z
          .object({
            stage: z.enum(["SINGLE_SHARD", "SHARD_MERGE"]),
            shards: z.array(shardedFindShardSchema),
            queryPlan: winningPlanSchema.optional(),
            slotBasedPlan: slotBasedPlanSchema.optional(),
            isCached: z.boolean().optional(),
          })
          .loose(),
      })
      .loose()
      .optional(),
    executionStats: z
      .object({
        nReturned: z.number().optional(),
        executionTimeMillis: z.number().optional(),
        totalKeysExamined: z.number().optional(),
        totalDocsExamined: z.number().optional(),
        executionStages: z
          .object({
            stage: z.enum(["SINGLE_SHARD", "SHARD_MERGE"]),
            shards: z.array(shardedFindShardSchema),
          })
          .loose()
          .optional(),
        allPlansExecution: z.array(planExecutionStatsSchema).optional(),
      })
      .loose()
      .optional(),
  })
  .loose();

// Modern sharded aggregation schema
const modernShardedAggregationShardSchema = z
  .object({
    host: z.string(),
    explainVersion: z.string().optional(),
    // Aggregation pipeline stages array (common with Atlas Search, MongoDB 8.0+)
    stages: z.array(z.record(z.string(), z.unknown())).optional(),
    queryPlanner: z
      .object({
        namespace: z.string().optional(),
        parsedQuery: z.record(z.string(), z.unknown()).optional(),
        indexFilterSet: z.boolean().optional(),
        queryHash: z.string().optional(),
        planCacheKey: z.string().optional(),
        planCacheShapeHash: z.string().optional(),
        optimizationTimeMillis: z.number().optional(),
        optimizedPipeline: z.boolean().optional(),
        maxIndexedOrSolutionsReached: z.boolean().optional(),
        maxIndexedAndSolutionsReached: z.boolean().optional(),
        maxScansToExplodeReached: z.boolean().optional(),
        prunedSimilarIndexes: z.boolean().optional(),
        winningPlan: z
          .object({
            isCached: z.boolean().optional(),
            queryPlan: winningPlanSchema.optional(),
            slotBasedPlan: slotBasedPlanSchema.optional(),
          })
          .loose()
          .optional(),
        rejectedPlans: z
          .array(
            z
              .object({
                queryPlan: winningPlanSchema.optional(),
                slotBasedPlan: slotBasedPlanSchema.optional(),
                isCached: z.boolean().optional(),
              })
              .loose(),
          )
          .optional(),
      })
      .loose()
      .optional(),
    executionStats: z
      .object({
        executionSuccess: z.boolean().optional(),
        nReturned: z.number().optional(),
        executionTimeMillis: z.number().optional(),
        totalKeysExamined: z.number().optional(),
        totalDocsExamined: z.number().optional(),
        executionStages: explainStageSchema.optional(),
      })
      .loose()
      .optional(),
  })
  .loose();

const modernShardedAggregationSchema = z
  .object({
    // SBE format (explainVersion: "2") - aggregation pipelines
    stages: z.array(sbeAggregationStageSchema).optional(),
    serverInfo: z.record(z.string(), z.unknown()).optional(),
    serverParameters: z.record(z.string(), z.unknown()).optional(),
    queryPlanner: z
      .object({
        plannerVersion: z.number().optional(),
        mongosPlannerVersion: z.number().optional(),
        namespace: z.string().optional(),
        indexFilterSet: z.boolean().optional(),
        parsedQuery: z.record(z.string(), z.unknown()).optional(),
        queryHash: z.string().optional(),
        planCacheShapeHash: z.string().optional(),
        planCacheKey: z.string().optional(),
        optimizationTimeMillis: z.number().optional(),
        maxIndexedOrSolutionsReached: z.boolean().optional(),
        maxIndexedAndSolutionsReached: z.boolean().optional(),
        maxScansToExplodeReached: z.boolean().optional(),
        prunedSimilarIndexes: z.boolean().optional(),
        winningPlan: z
          .object({
            isCached: z.boolean().optional(),
            queryPlan: winningPlanWithSbeSchema.optional(),
            slotBasedPlan: slotBasedPlanSchema.optional(),
            stage: z.string().optional(),
            shards: z.array(shardedFindShardSchema).optional(),
          })
          .loose()
          .optional(),
        rejectedPlans: z
          .array(
            z
              .object({
                queryPlan: winningPlanSchema.optional(),
                slotBasedPlan: slotBasedPlanSchema.optional(),
                isCached: z.boolean().optional(),
              })
              .loose(),
          )
          .optional(),
      })
      .loose()
      .optional(),
    executionStats: z
      .object({
        nReturned: z.number().optional(),
        executionTimeMillis: z.number().optional(),
        totalKeysExamined: z.number().optional(),
        totalDocsExamined: z.number().optional(),
        executionStages: explainStageSchema.optional(),
        allPlansExecution: z.array(planExecutionStatsSchema).optional(),
      })
      .loose()
      .optional(),
    splitPipeline: z.null().optional(), // null indicates no pipeline splitting
    shards: z.record(z.string(), modernShardedAggregationShardSchema),
    queryShapeHash: z.string().optional(),
    command: z.record(z.string(), z.unknown()).optional(),
    ok: z.number().optional(),
  })
  .loose();

// Base explain plan schema (single-node plans)
const baseExplainPlanSchema = z
  .object({
    explainVersion: z.string().optional(),
    // Additional fields that may be present in MongoDB explain output
    queryShapeHash: z.string().optional(),
    command: z.record(z.string(), z.unknown()).optional(),
    serverInfo: z.record(z.string(), z.unknown()).optional(),
    serverParameters: z.record(z.string(), z.unknown()).optional(),
    ok: z.number().optional(),
    // SBE format (explainVersion: "2") - aggregation pipelines
    stages: z.array(sbeAggregationStageSchema).optional(),
    // Traditional format (explainVersion: "1" or undefined)
    queryPlanner: z
      .object({
        plannerVersion: z.number().optional(),
        mongosPlannerVersion: z.number().optional(), // For sharded queries
        namespace: z.string().optional(),
        indexFilterSet: z.boolean().optional(),
        parsedQuery: z.record(z.string(), z.unknown()).optional(),
        queryHash: z.string().optional(),
        planCacheShapeHash: z.string().optional(),
        planCacheKey: z.string().optional(),
        optimizationTimeMillis: z.number().optional(),
        maxIndexedOrSolutionsReached: z.boolean().optional(),
        maxIndexedAndSolutionsReached: z.boolean().optional(),
        maxScansToExplodeReached: z.boolean().optional(),
        prunedSimilarIndexes: z.boolean().optional(),
        winningPlan: z
          .object({
            isCached: z.boolean().optional(),
            queryPlan: winningPlanWithSbeSchema.optional(),
            slotBasedPlan: slotBasedPlanSchema.optional(),
            // Flexible stage field - can be any MongoDB stage type
            stage: z.string().optional(),
            // Sharded find query support
            shards: z.array(shardedFindShardSchema).optional(),
          })
          .loose()
          .optional(),
        rejectedPlans: z
          .array(
            z
              .object({
                queryPlan: winningPlanSchema.optional(),
                slotBasedPlan: slotBasedPlanSchema.optional(),
                isCached: z.boolean().optional(),
              })
              .loose(),
          )
          .optional(),
      })
      .loose()
      .optional(),
    executionStats: z
      .object({
        executionSuccess: z.boolean().optional(),
        nReturned: z.number().optional(),
        executionTimeMillis: z.number().optional(),
        totalKeysExamined: z.number().optional(),
        totalDocsExamined: z.number().optional(),
        executionStages: z
          .object({
            stage: z.string().optional(),
            // Support sharded execution stages
            shards: z.array(shardedFindShardSchema).optional(),
          })
          .loose()
          .and(explainStageSchema)
          .optional(),
        allPlansExecution: z.array(planExecutionStatsSchema).optional(),
      })
      .loose()
      .optional(),
    // Handle direct stage format (some versions return this)
    stage: z.string().optional(),
    inputStage: explainStageSchema.optional(),
    inputStages: z.array(explainStageSchema).optional(),
    // Legacy sharded aggregation detection (for error handling)
    shards: z
      .record(
        z.string(),
        z
          .object({
            host: z.string(),
            stages: z.array(z.unknown()).optional(),
          })
          .loose(),
      )
      .optional(),
    splitPipeline: z
      .object({
        shardsPart: z.array(z.unknown()),
        mergerPart: z.array(z.unknown()),
      })
      .optional(),
  })
  .loose(); // Allow additional fields

// Union type for all explain plan formats
export const explainPlanSchema = z.union([
  baseExplainPlanSchema,
  shardedFindPlanSchema,
  modernShardedAggregationSchema,
]);

// ============================================================================
// Normalized structures for visualization
// ============================================================================

// Shared structural fields for both plan and execution stages
export type StageStructure = {
  indexName?: string;
  direction?: string;
  filter?: unknown;
  indexBounds?: unknown;
  keyPattern?: unknown;
  sortPattern?: unknown;
  limitAmount?: number;
  sort?: unknown;
  limit?: number;
  skip?: number;
  projection?: unknown;
};

// Structural fields only (for query plan visualization)
export type NormalizedPlanStage = {
  id: string;
  stage: string;
  category: StageCategory;
  iconName: string;
  definition?: StageDefinition;
  structure: StageStructure;
  shardName?: string;
  children: NormalizedPlanStage[];
  depth: number;
  // Discriminant fields: plan stages never have metrics or efficiency
  metrics?: undefined;
  efficiency?: undefined;
};

// Full execution metrics (for execution flow visualization)
export type NormalizedExecutionStage = {
  id: string;
  stage: string;
  category: StageCategory;
  iconName: string;
  definition?: StageDefinition;
  structure: StageStructure;
  shardName?: string;
  executionSuccess?: boolean;
  metrics: {
    nReturned?: number;
    docsExamined?: number;
    keysExamined?: number;
    executionTimeMillis?: number;
    selfTimeMillis?: number;
    works?: number;
    advanced?: number;
    needTime?: number;
    needYield?: number;
    saveState?: number;
    restoreState?: number;
    memLimit?: number;
    totalDataSizeSorted?: number;
    totalDataSizeSortedBytesEstimate?: number;
    usedDisk?: boolean;
    seeks?: number;
    dupsTested?: number;
    dupsDropped?: number;
    alreadyHasObj?: number;
  };
  children: NormalizedExecutionStage[];
  depth: number;
  efficiency?: {
    selectivity?: number;
    indexUsage?: number;
  };
};

// Union type: NormalizedStage is either a plan stage or an execution stage
export type NormalizedStage = NormalizedPlanStage | NormalizedExecutionStage;

/**
 * Type guard: check if a NormalizedStage has execution metrics.
 * Named to avoid collision with isExecutionStage in #data/stages/types.ts.
 */
export function hasExecutionMetrics(
  stage: NormalizedStage,
): stage is NormalizedExecutionStage {
  return stage.metrics !== undefined;
}

// Forward type declarations for circular references
export type WinningPlanWithSbe = z.infer<typeof executionStageSchema> & {
  inputStage?: WinningPlanWithSbe;
  inputStages?: WinningPlanWithSbe[];
  shards?: ShardExecutionData[];
  sort?: unknown;
  limit?: number;
  skip?: number;
  projection?: unknown;
  slotBasedPlan?: SlotBasedPlan;
};

// Type definitions
export type ExplainPlan = z.infer<typeof explainPlanSchema>;
export type PlanExecutionStats = z.infer<typeof planExecutionStatsSchema>;
export type PlanComparison = z.infer<typeof planComparisonSchema>;
export type SlotBasedPlan = z.infer<typeof slotBasedPlanSchema>;
export type SBEAggregationStage = z.infer<typeof sbeAggregationStageSchema>;
export type ShardedFindPlan = z.infer<typeof shardedFindPlanSchema>;
export type ModernShardedAggregationPlan = z.infer<
  typeof modernShardedAggregationSchema
>;

// Plan selection analysis result
export type PlanSelectionAnalysis = {
  winningPlan: PlanComparison;
  rejectedPlans: PlanComparison[];
  recommendation: string;
  insights: string[];
  optimizationTimeMillis?: number;
  plannerLimits?: {
    maxIndexedOrSolutionsReached?: boolean;
    maxIndexedAndSolutionsReached?: boolean;
    maxScansToExplodeReached?: boolean;
  };
  cacheInfo?: {
    queryHash?: string;
    planCacheKey?: string;
    planCacheShapeHash?: string;
    isCached?: boolean;
    queryShapeHash?: string;
  };
  queryPlannerInfo?: {
    indexFilterSet?: boolean;
    prunedSimilarIndexes?: boolean;
  };
};

// ESR (Equality, Sort, Range) analysis for compound indexes
export type ESRAnalysis = {
  indexName: string;
  keyPattern: Record<string, number>;
  queryConditions: QueryCondition[];
  esrPattern: ESRPattern;
  insights: string[];
  indexMetadata?: {
    isMultiKey?: boolean;
    isUnique?: boolean;
    isSparse?: boolean;
    isPartial?: boolean;
    indexVersion?: number;
    multiKeyPaths?: Record<string, string[]>;
  };
};

export type QueryCondition = {
  field: string;
  type: "equality" | "sort" | "range" | "other";
  operator: string;
  indexPosition?: number;
  indexDirection?: number;
  isUsed?: boolean; // Whether this condition actually uses the index
};

export type ESRPattern = {
  description: string;
  equalityFields: string[];
  sortFields: string[];
  rangeFields: string[];
  unusedIndexFields: string[];
  followsESRPattern: boolean;
  explanation: string;
};

// SBE (Slot-Based Execution) plan types
export type SBESlotEnvironment = {
  resultSlot: string;
  slots: Record<string, SBESlotInfo>;
};

export type SBESlotInfo = {
  value: string;
  type: SBESlotType;
  description?: string;
};

export type SBESlotType =
  | "index_bounds"
  | "context_constant"
  | "value_list"
  | "field_path"
  | "literal"
  | "expression"
  | "unknown";

export type SBEStage = {
  nodeId: number;
  stageType: string;
  slotReferences: string[];
  details: string;
  children: SBEStage[];
  parent?: SBEStage;
  slotBehavior?: SBESlotBehavior;
};

export type SBESlotBehavior = {
  consumes: string[];
  produces: string[];
  transform: SBETransformType;
  mappings?: Record<string, string>;
};

export type SBETransformType =
  | "data_access"
  | "filter"
  | "projection"
  | "aggregation"
  | "join"
  | "sort"
  | "limit"
  | "pass_through"
  | "unknown";

export type SBESlotTrace = {
  slotId: string;
  createdBy: string;
  transformations: SBESlotTransformation[];
  finalUsage: string;
  inferredMeaning?: string;
};

export type SBESlotTransformation = {
  stageId: string;
  stageType: string;
  operation: string;
  inputSlots: string[];
  outputSlots: string[];
};

export type SBEPlan = {
  slotEnvironment: SBESlotEnvironment;
  stageHierarchy: SBEStage[];
  slotFlowGraph: SBESlotFlowGraph;
  performance?: SBEPerformanceMetrics;
};

export type SBESlotFlowGraph = {
  nodes: SBESlotNode[];
  edges: SBESlotEdge[];
  clusters: SBEStageCluster[];
};

export type SBESlotNode = {
  id: string;
  type: "environment" | "intermediate" | "result";
  slotType: SBESlotType;
  value?: string;
  producer?: string;
  nodeId?: number;
};

export type SBESlotEdge = {
  source: string;
  target: string;
  stage: string;
  transform: SBETransformType;
  stageNodeId: number;
};

export type SBEStageCluster = {
  stageId: string;
  stageType: string;
  nodeId: number;
  slotIds: string[];
  bounds: { x: number; y: number; width: number; height: number };
};

export type SBEPerformanceMetrics = {
  bottlenecks: Record<string, SBEBottleneck>;
  totalExecutionTime: number;
  slotUtilization: Record<string, number>;
};

export type SBEBottleneck = {
  severity: "critical" | "major" | "minor";
  percentage: number;
  memoryPressure?: boolean;
  recommendation?: string;
};

// Additional slot analysis types for SBE processing
export type SlotDefinition = {
  slotId: string;
  createdAt: string; // stage where slot is defined
  slotType: SBESlotType;
  initialValue?: string;
  fieldOrigin?: string; // inferred field name if from getField
};

export type SlotUsage = {
  slotId: string;
  usedAt: string; // stage where slot is consumed
  operation: string; // operation type (input, transform, output)
  purpose: SlotUsagePurpose;
};

export type SlotUsagePurpose =
  | "input"
  | "grouping"
  | "aggregation"
  | "projection"
  | "filter"
  | "output"
  | "intermediate";

export type SlotLineage = {
  slotId: string;
  definition: SlotDefinition;
  usages: SlotUsage[];
  transformations: SBESlotTransformation[];
  descendants: string[]; // slots created from this slot
  ancestors: string[]; // slots that contributed to this slot
  inferredMeaning: string;
};

export type SBEStageMetrics = {
  stageId: string;
  stageType: string;
  nodeId: number;
  slotsConsumed: string[];
  slotsProduced: string[];
  executionTimeMillis?: number;
  documentsProcessed?: number;
  complexity: SBEComplexityLevel;
};

export type SBEComplexityLevel =
  | "simple"
  | "moderate"
  | "complex"
  | "very_complex";

// Extended SBE execution statistics types
export type SBEPerformanceLevel =
  | "excellent"
  | "good"
  | "moderate"
  | "poor"
  | "inactive"
  | "unknown";

export type SBEIndexStats = {
  indexName: string;
  keysExamined: number;
  seeks: number;
  numReads: number;
  keyCheckSkipped?: number;
  indexesUsed: string[];
  indexKeySlot?: number;
  recordIdSlot?: number;
  snapshotIdSlot?: number;
  indexIdentSlot?: number;
  seekKeyLow?: string;
  seekKeyHigh?: string;
};

export type SBEBranchStats = {
  numTested: number;
  thenBranchOpens: number;
  thenBranchCloses: number;
  elseBranchOpens: number;
  elseBranchCloses: number;
  filter?: string;
  thenSlots: number[];
  elseSlots: number[];
  outputSlots: number[];
};

export type SBEStageExecutionStats = {
  stageName: string;
  planNodeId: number;
  path: string;

  // Core execution metrics
  coreMetrics: {
    nReturned: number;
    executionTimeMillisEstimate: number;
    opens: number;
    closes: number;
    saveState: number;
    restoreState: number;
    isEOF: number;
  };

  // Index operation metrics
  indexStats: SBEIndexStats | null;

  // Collection operation metrics
  collectionStats: {
    totalDocsExamined?: number;
    totalKeysExamined?: number;
    collectionScans?: number;
    collectionSeeks?: number;
    indexScans?: number;
    indexSeeks?: number;
    numReads?: number;
  };

  // Branch-specific metrics
  branchStats: SBEBranchStats | null;

  // Slot mappings
  slotMappings: Record<string, number>;

  // Projections and expressions
  projections: Record<string, string>;

  // Performance analysis
  performanceLevel: SBEPerformanceLevel;

  // Stage-specific additional data
  stageSpecificData: Record<string, unknown>;
};

// Parsed SBE plan structure
export type ParsedSBEPlan = {
  explainVersion: "2";
  slotEnvironment: SBESlotEnvironment;
  stages: SBEStage[];
  slotLineages: SlotLineage[];
  stageMetrics: SBEStageMetrics[];
  queryPlanStages: Map<number, string>; // Maps planNodeId to stage name (e.g., 1 -> "IXSCAN", 2 -> "FETCH")
  executionStatsMap: Map<number, SBEStageExecutionStats[]>; // Maps planNodeId to execution statistics
  originalSlotString: string;
  originalStagesString: string;
};

// Hybrid SBE plan that combines query plan hierarchy with SBE implementation
export type HybridSBEPlan = {
  explainVersion: "2";
  hybridStages: HybridSBEStage[];
  slotEnvironment: SBESlotEnvironment;
  slotLineages: SlotLineage[];
  originalQueryPlan: WinningPlan;
  originalSlotBasedPlan: SlotBasedPlan;
};

export type HybridSBEStage = {
  // High-level query plan stage (matches classic visualization)
  queryPlanStage: {
    stage: string; // "IXSCAN", "FETCH", "PROJECTION_DEFAULT"
    planNodeId: number; // 1, 2, 3
    indexName?: string; // From queryPlan
    filter?: unknown; // From queryPlan
    keyPattern?: unknown; // From queryPlan
    direction?: string; // From queryPlan
    indexBounds?: unknown; // From queryPlan
    sort?: unknown; // From queryPlan
    limit?: number; // From queryPlan
    projection?: unknown; // From queryPlan
  };

  // SBE implementation (grouped by planNodeId)
  sbeImplementation: {
    stages: SBEStage[]; // All [1], [2], or [3] stages
    primarySlotFlow: {
      input: string[]; // Slots consumed from previous stage
      output: string[]; // Slots produced for next stage
      internal: string[]; // Slots used only within this stage
    };
  };

  // Layout positioning (bottom-to-top)
  position: {
    level: number; // 0=bottom (data source), higher=toward result
    order: number; // For multiple stages at same level
  };

  // Performance metrics from original query plan
  metrics?: {
    nReturned?: number;
    keysExamined?: number;
    docsExamined?: number;
    executionTimeMillis?: number;
  };
};
