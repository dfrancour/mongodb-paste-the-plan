/**
 * ESR (Equality, Sort, Range) Analysis Utilities
 *
 * Utility functions for extracting query conditions, finding used indexes,
 * and analyzing ESR pattern compliance in MongoDB explain plans.
 *
 * These utilities are used by:
 * - esr_compliance.ts analyzer (generates AnalysisFinding[])
 * - UI components (ESRAnalysis.tsx for educational display)
 */

import type {
  ExplainPlan,
  ESRAnalysis,
  QueryCondition,
  ESRPattern,
} from "#types/explain-plan";
import { isNonEmptyObject } from "#lib/utils/jsxUtils";

// ============================================================================
// Query Condition Extraction
// ============================================================================

/**
 * Extract query conditions from the explain plan's parsed query
 */
export function extractQueryConditions(plan: ExplainPlan): QueryCondition[] {
  const conditions: QueryCondition[] = [];

  // Extract from queryPlanner.parsedQuery
  if (plan.queryPlanner?.parsedQuery) {
    extractConditionsFromQuery(plan.queryPlanner.parsedQuery, conditions);
  }

  // Extract sort conditions if present
  if (plan.queryPlanner?.winningPlan) {
    extractSortConditions(plan.queryPlanner.winningPlan, conditions);
  }

  // Handle sharded plans - extract conditions from individual shards
  if (
    plan.queryPlanner?.winningPlan &&
    typeof plan.queryPlanner.winningPlan === "object"
  ) {
    const winningPlan = plan.queryPlanner.winningPlan as Record<
      string,
      unknown
    >;
    if (winningPlan.shards && Array.isArray(winningPlan.shards)) {
      for (const shard of winningPlan.shards) {
        if (shard && typeof shard === "object") {
          const shardObj = shard as Record<string, unknown>;
          // Extract from shard's parsedQuery
          if (shardObj.parsedQuery) {
            extractConditionsFromQuery(shardObj.parsedQuery, conditions);
          }
          // Extract from shard's winningPlan
          if (shardObj.winningPlan) {
            extractSortConditions(shardObj.winningPlan, conditions);
          }
        }
      }
    }
  }

  // Handle sharded aggregation plans - shards as object with shard names as keys
  if (typeof plan === "object" && plan && "shards" in plan) {
    const planObj = plan as Record<string, unknown>;
    if (
      planObj.shards &&
      typeof planObj.shards === "object" &&
      !Array.isArray(planObj.shards)
    ) {
      const shards = planObj.shards as Record<string, unknown>;
      for (const shardData of Object.values(shards)) {
        if (shardData && typeof shardData === "object") {
          const shard = shardData as Record<string, unknown>;
          // Extract from queryPlanner.parsedQuery
          if (shard.queryPlanner && typeof shard.queryPlanner === "object") {
            const queryPlanner = shard.queryPlanner as Record<string, unknown>;
            if (queryPlanner.parsedQuery) {
              extractConditionsFromQuery(queryPlanner.parsedQuery, conditions);
            }
          }
        }
      }
    }
  }

  return conditions;
}

/**
 * Recursively extract conditions from a MongoDB query object
 */
function extractConditionsFromQuery(
  query: unknown,
  conditions: QueryCondition[],
): void {
  if (!isNonEmptyObject(query)) return;

  for (const [field, value] of Object.entries(query)) {
    if (field === "$and" && Array.isArray(value)) {
      // Handle $and clauses
      for (const subQuery of value) {
        extractConditionsFromQuery(subQuery, conditions);
      }
    } else if (field === "$or" && Array.isArray(value)) {
      // Handle $or clauses
      for (const subQuery of value) {
        extractConditionsFromQuery(subQuery, conditions);
      }
    } else if (field.startsWith("$")) {
      // Skip other MongoDB operators at root level
      continue;
    } else if (isNonEmptyObject(value)) {
      // Field-level conditions
      analyzeFieldCondition(field, value, conditions);
    } else {
      // Simple equality condition
      conditions.push({
        field,
        type: "equality",
        operator: "$eq",
      });
    }
  }
}

/**
 * Analyze a single field's conditions
 */
function analyzeFieldCondition(
  field: string,
  condition: Record<string, unknown>,
  conditions: QueryCondition[],
): void {
  for (const [operator, value] of Object.entries(condition)) {
    let type: QueryCondition["type"] = "other";

    switch (operator) {
      case "$eq":
        type = "equality";
        break;
      case "$gt":
      case "$gte":
      case "$lt":
      case "$lte":
      case "$ne":
        type = "range";
        break;
      case "$in":
      case "$nin":
        // $in with 200+ elements behaves like range, otherwise equality
        if (Array.isArray(value) && value.length >= 200) {
          type = "range";
        } else {
          type = "equality";
        }
        break;
      case "$regex":
      case "$text":
        type = "range"; // Text searches are range-like
        break;
      default:
        type = "other";
    }

    conditions.push({
      field,
      type,
      operator,
    });
  }
}

/**
 * Extract sort conditions from the winning plan
 */
function extractSortConditions(
  winningPlan: unknown,
  conditions: QueryCondition[],
): void {
  if (winningPlan && typeof winningPlan === "object") {
    const plan = winningPlan as Record<string, unknown>;
    if (plan.stage === "SORT" && plan.sortPattern) {
      const sortPattern = plan.sortPattern as Record<string, number>;
      for (const [field, direction] of Object.entries(sortPattern)) {
        conditions.push({
          field,
          type: "sort",
          operator: "$sort",
          indexDirection: direction,
        });
      }
    }
  }
}

// ============================================================================
// Index Extraction
// ============================================================================

export interface IndexInfo {
  indexName: string;
  keyPattern: Record<string, number>;
  metadata?: {
    isMultiKey?: boolean;
    isUnique?: boolean;
    isSparse?: boolean;
    isPartial?: boolean;
    indexVersion?: number;
    multiKeyPaths?: Record<string, string[]>;
  };
}

/**
 * Extract information about indexes used in the execution plan
 */
export function extractUsedIndexes(plan: ExplainPlan): IndexInfo[] {
  const indexes: IndexInfo[] = [];

  // Extract from execution stages
  if (plan.executionStats?.executionStages) {
    findIndexesInStage(plan.executionStats.executionStages, indexes);
  }

  // Extract from winning plan if no execution stats
  if (indexes.length === 0 && plan.queryPlanner?.winningPlan) {
    findIndexesInStage(plan.queryPlanner.winningPlan, indexes);
  }

  // Handle sharded plans - extract indexes from individual shards
  if (
    plan.queryPlanner?.winningPlan &&
    typeof plan.queryPlanner.winningPlan === "object"
  ) {
    const winningPlan = plan.queryPlanner.winningPlan as Record<
      string,
      unknown
    >;
    if (winningPlan.shards && Array.isArray(winningPlan.shards)) {
      for (const shard of winningPlan.shards) {
        if (shard && typeof shard === "object") {
          const shardObj = shard as Record<string, unknown>;
          // Extract from shard's winningPlan
          if (shardObj.winningPlan) {
            findIndexesInStage(shardObj.winningPlan, indexes);
          }
        }
      }
    }
  }

  // Handle sharded aggregation plans - shards as object with shard names as keys
  if (typeof plan === "object" && plan && "shards" in plan) {
    const planObj = plan as Record<string, unknown>;
    if (
      planObj.shards &&
      typeof planObj.shards === "object" &&
      !Array.isArray(planObj.shards)
    ) {
      const shards = planObj.shards as Record<string, unknown>;
      for (const shardData of Object.values(shards)) {
        if (shardData && typeof shardData === "object") {
          const shard = shardData as Record<string, unknown>;
          // Extract from queryPlanner.winningPlan
          if (shard.queryPlanner && typeof shard.queryPlanner === "object") {
            const queryPlanner = shard.queryPlanner as Record<string, unknown>;
            if (queryPlanner.winningPlan) {
              findIndexesInStage(queryPlanner.winningPlan, indexes);
            }
          }
          // Extract from executionStats.executionStages
          if (
            shard.executionStats &&
            typeof shard.executionStats === "object"
          ) {
            const executionStats = shard.executionStats as Record<
              string,
              unknown
            >;
            if (executionStats.executionStages) {
              findIndexesInStage(executionStats.executionStages, indexes);
            }
          }
        }
      }
    }
  }

  return indexes;
}

/**
 * Recursively find indexes in execution stages
 */
function findIndexesInStage(stage: unknown, indexes: IndexInfo[]): void {
  if (!stage || typeof stage !== "object") return;

  const stageObj = stage as Record<string, unknown>;

  // Check if this stage uses an index (IXSCAN, COUNT_SCAN, or ixseek)
  if (
    (stageObj.stage === "IXSCAN" ||
      stageObj.stage === "COUNT_SCAN" ||
      stageObj.stage === "ixseek") &&
    stageObj.indexName &&
    stageObj.keyPattern
  ) {
    const indexName = stageObj.indexName as string;
    const keyPattern = stageObj.keyPattern as Record<string, number>;

    // Extract index metadata
    const metadata = {
      isMultiKey: stageObj.isMultiKey as boolean | undefined,
      isUnique: stageObj.isUnique as boolean | undefined,
      isSparse: stageObj.isSparse as boolean | undefined,
      isPartial: stageObj.isPartial as boolean | undefined,
      indexVersion: stageObj.indexVersion as number | undefined,
      multiKeyPaths: stageObj.multiKeyPaths as
        | Record<string, string[]>
        | undefined,
    };

    // Avoid duplicates
    if (!indexes.find((idx) => idx.indexName === indexName)) {
      indexes.push({ indexName, keyPattern, metadata });
    }
  }

  // Handle queryPlan wrapper (common in aggregation plans)
  if (stageObj.queryPlan) {
    findIndexesInStage(stageObj.queryPlan, indexes);
  }

  // Recursively check child stages
  if (stageObj.inputStage) {
    findIndexesInStage(stageObj.inputStage, indexes);
  }

  if (stageObj.inputStages && Array.isArray(stageObj.inputStages)) {
    for (const inputStage of stageObj.inputStages) {
      findIndexesInStage(inputStage, indexes);
    }
  }

  // Handle sharded queries
  if (stageObj.shards && Array.isArray(stageObj.shards)) {
    for (const shard of stageObj.shards) {
      if (shard && typeof shard === "object" && "executionStages" in shard) {
        findIndexesInStage(
          (shard as Record<string, unknown>).executionStages,
          indexes,
        );
      }
    }
  }
}

// ============================================================================
// ESR Pattern Analysis
// ============================================================================

/**
 * Analyze ESR pattern for a specific index
 */
export function analyzeESRPattern(
  indexFields: string[],
  conditions: QueryCondition[],
): ESRPattern {
  // Group conditions by type
  const equalityConditions = conditions.filter((c) => c.type === "equality");
  const sortConditions = conditions.filter((c) => c.type === "sort");
  const rangeConditions = conditions.filter((c) => c.type === "range");

  const equalityFields = equalityConditions.map((c) => c.field);
  const sortFields = sortConditions.map((c) => c.field);
  const rangeFields = rangeConditions.map((c) => c.field);

  // Find unused index fields
  const usedFields = new Set(conditions.map((c) => c.field));
  const unusedIndexFields = indexFields.filter(
    (field) => !usedFields.has(field),
  );

  // Check if follows ESR pattern (equality positions < sort positions < range positions)
  const equalityPositions = equalityConditions.map(
    (c) => c.indexPosition ?? -1,
  );
  const sortPositions = sortConditions.map((c) => c.indexPosition ?? -1);
  const rangePositions = rangeConditions.map((c) => c.indexPosition ?? -1);

  const maxEqualityPos =
    equalityPositions.length > 0 ? Math.max(...equalityPositions) : -1;
  const minSortPos =
    sortPositions.length > 0 ? Math.min(...sortPositions) : Infinity;
  const minRangePos =
    rangePositions.length > 0 ? Math.min(...rangePositions) : Infinity;

  const followsESRPattern =
    (equalityPositions.length === 0 ||
      sortPositions.length === 0 ||
      maxEqualityPos < minSortPos) &&
    (sortPositions.length === 0 ||
      rangePositions.length === 0 ||
      minSortPos < minRangePos) &&
    (equalityPositions.length === 0 ||
      rangePositions.length === 0 ||
      maxEqualityPos < minRangePos);

  // Generate explanation
  const explanation = followsESRPattern
    ? `Query conditions follow ESR pattern: equality fields first, then sort fields, then range fields.`
    : `Query conditions do not follow optimal ESR (Equality, Sort, Range) ordering in this index.`;

  return {
    description: `${equalityFields.length} equality, ${sortFields.length} sort, ${rangeFields.length} range conditions`,
    equalityFields,
    sortFields,
    rangeFields,
    unusedIndexFields,
    followsESRPattern,
    explanation,
  };
}

/**
 * Generate insights about index usage
 */
export function generateInsights(
  indexFields: string[],
  conditions: QueryCondition[],
  esrPattern: ESRPattern,
): string[] {
  const insights: string[] = [];

  // Insight about query coverage
  insights.push(
    `Query uses ${conditions.length} of ${indexFields.length} index fields`,
  );

  // Specific insights about $in with large arrays
  const inConditions = conditions.filter((c) => c.operator === "$in");
  for (const inCondition of inConditions) {
    if (inCondition.type === "range") {
      insights.push(
        `$in on ${inCondition.field} has 200+ elements - behaves like range operation`,
      );
    }
  }

  // Insight about equality conditions and their effectiveness
  if (esrPattern.equalityFields.length > 0) {
    insights.push(
      `Equality conditions should eliminate 90%+ of documents: ${esrPattern.equalityFields.join(", ")}`,
    );
  }

  // Insight about sort optimization
  if (esrPattern.sortFields.length > 0) {
    if (esrPattern.followsESRPattern) {
      insights.push(
        `Sort can use index optimization on: ${esrPattern.sortFields.join(", ")}`,
      );
    } else {
      insights.push(
        `Sort may require in-memory operation for: ${esrPattern.sortFields.join(", ")}`,
      );
    }
  }

  // Insight about range conditions
  if (esrPattern.rangeFields.length > 0) {
    insights.push(
      `Range conditions prevent index sorts on subsequent fields: ${esrPattern.rangeFields.join(", ")}`,
    );
  }

  return insights;
}

// ============================================================================
// Main Analysis Function
// ============================================================================

/**
 * Analyze ESR compliance for all indexes used in an explain plan
 */
export function analyzeExplainPlan(plan: ExplainPlan): ESRAnalysis[] {
  const analyses: ESRAnalysis[] = [];

  // Get query conditions from the parsed query
  const queryConditions = extractQueryConditions(plan);

  // Find all indexes used in the execution
  const usedIndexes = extractUsedIndexes(plan);

  for (const indexInfo of usedIndexes) {
    const analysis = analyzeIndex(indexInfo, queryConditions);
    if (analysis) {
      analyses.push(analysis);
    }
  }

  return analyses;
}

/**
 * Analyze how query conditions map to a specific index
 */
function analyzeIndex(
  indexInfo: IndexInfo,
  queryConditions: QueryCondition[],
): ESRAnalysis | null {
  const { indexName, keyPattern, metadata } = indexInfo;
  const indexFields = Object.keys(keyPattern);

  // Map query conditions to index positions
  const mappedConditions = queryConditions.map((condition) => ({
    ...condition,
    indexPosition: indexFields.indexOf(condition.field),
    indexDirection: keyPattern[condition.field],
    isUsed: indexFields.includes(condition.field),
  }));

  const usedConditions = mappedConditions.filter((c) => c.isUsed);

  if (usedConditions.length === 0) {
    return null;
  }

  const esrPattern = analyzeESRPattern(indexFields, usedConditions);
  const insights = generateInsights(indexFields, usedConditions, esrPattern);

  return {
    indexName,
    keyPattern,
    queryConditions: mappedConditions,
    esrPattern,
    insights,
    indexMetadata: metadata,
  };
}
