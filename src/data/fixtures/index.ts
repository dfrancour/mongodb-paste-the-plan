// Basic plans
import collectionScanAllPlans from "./basic/collection-scan.allPlansExecution.json";
import collectionScanExecStats from "./basic/collection-scan.executionStats.json";
import collectionScanQueryPlanner from "./basic/collection-scan.queryPlanner.json";
import compoundIndexAllPlans from "./basic/compound-index.allPlansExecution.json";
import compoundIndexExecStats from "./basic/compound-index.executionStats.json";
import compoundIndexQueryPlanner from "./basic/compound-index.queryPlanner.json";
import indexWithFetchAllPlans from "./basic/index-with-fetch.allPlansExecution.json";
import indexWithFetchExecStats from "./basic/index-with-fetch.executionStats.json";
import indexWithFetchQueryPlanner from "./basic/index-with-fetch.queryPlanner.json";
import simpleIndexScanAllPlans from "./basic/simple-index-scan.allPlansExecution.json";
import simpleIndexScanExecStats from "./basic/simple-index-scan.executionStats.json";
import simpleIndexScanQueryPlanner from "./basic/simple-index-scan.queryPlanner.json";

// Performance plans
import coveredQueryAllPlans from "./performance/covered-query.allPlansExecution.json";
import coveredQueryExecStats from "./performance/covered-query.executionStats.json";
import coveredQueryQueryPlanner from "./performance/covered-query.queryPlanner.json";
import inefficientQueryAllPlans from "./performance/inefficient-query.allPlansExecution.json";
import inefficientQueryExecStats from "./performance/inefficient-query.executionStats.json";
import inefficientQueryQueryPlanner from "./performance/inefficient-query.queryPlanner.json";
import sortWithIndexAllPlans from "./performance/sort-with-index.allPlansExecution.json";
import sortWithIndexExecStats from "./performance/sort-with-index.executionStats.json";
import sortWithIndexQueryPlanner from "./performance/sort-with-index.queryPlanner.json";
import sortWithoutIndexAllPlans from "./performance/sort-without-index.allPlansExecution.json";
import sortWithoutIndexExecStats from "./performance/sort-without-index.executionStats.json";
import sortWithoutIndexQueryPlanner from "./performance/sort-without-index.queryPlanner.json";

// Complex plans
import aggregationPipelineAllPlans from "./complex/aggregation-pipeline.allPlansExecution.json";
import aggregationPipelineExecStats from "./complex/aggregation-pipeline.executionStats.json";
import aggregationPipelineQueryPlanner from "./complex/aggregation-pipeline.queryPlanner.json";
import arrayOperationsAllPlans from "./complex/array-operations.allPlansExecution.json";
import arrayOperationsExecStats from "./complex/array-operations.executionStats.json";
import arrayOperationsQueryPlanner from "./complex/array-operations.queryPlanner.json";
import deepNestingAllPlans from "./complex/deep-nesting.allPlansExecution.json";
import deepNestingExecStats from "./complex/deep-nesting.executionStats.json";
import deepNestingQueryPlanner from "./complex/deep-nesting.queryPlanner.json";
import largeInClauseAllPlans from "./complex/large-in-clause.allPlansExecution.json";
import largeInClauseExecStats from "./complex/large-in-clause.executionStats.json";
import largeInClauseQueryPlanner from "./complex/large-in-clause.queryPlanner.json";
import lookupJoinAllPlans from "./complex/lookup-join.allPlansExecution.json";
import lookupJoinExecStats from "./complex/lookup-join.executionStats.json";
import lookupJoinQueryPlanner from "./complex/lookup-join.queryPlanner.json";
import orOperationAllPlans from "./complex/or-operation.allPlansExecution.json";
import orOperationExecStats from "./complex/or-operation.executionStats.json";
import orOperationQueryPlanner from "./complex/or-operation.queryPlanner.json";
import textSearchAllPlans from "./complex/text-search.allPlansExecution.json";
import textSearchExecStats from "./complex/text-search.executionStats.json";
import textSearchQueryPlanner from "./complex/text-search.queryPlanner.json";
import unwindWithGroupAllPlans from "./complex/unwind-with-group.allPlansExecution.json";
import unwindWithGroupExecStats from "./complex/unwind-with-group.executionStats.json";
import unwindWithGroupQueryPlanner from "./complex/unwind-with-group.queryPlanner.json";

/**
 * All example plan fixtures keyed by path (category/name.variant.json)
 */
export const fixtures: Record<string, unknown> = {
  "basic/collection-scan.allPlansExecution.json": collectionScanAllPlans,
  "basic/collection-scan.executionStats.json": collectionScanExecStats,
  "basic/collection-scan.queryPlanner.json": collectionScanQueryPlanner,
  "basic/compound-index.allPlansExecution.json": compoundIndexAllPlans,
  "basic/compound-index.executionStats.json": compoundIndexExecStats,
  "basic/compound-index.queryPlanner.json": compoundIndexQueryPlanner,
  "basic/index-with-fetch.allPlansExecution.json": indexWithFetchAllPlans,
  "basic/index-with-fetch.executionStats.json": indexWithFetchExecStats,
  "basic/index-with-fetch.queryPlanner.json": indexWithFetchQueryPlanner,
  "basic/simple-index-scan.allPlansExecution.json": simpleIndexScanAllPlans,
  "basic/simple-index-scan.executionStats.json": simpleIndexScanExecStats,
  "basic/simple-index-scan.queryPlanner.json": simpleIndexScanQueryPlanner,

  "performance/covered-query.allPlansExecution.json": coveredQueryAllPlans,
  "performance/covered-query.executionStats.json": coveredQueryExecStats,
  "performance/covered-query.queryPlanner.json": coveredQueryQueryPlanner,
  "performance/inefficient-query.allPlansExecution.json":
    inefficientQueryAllPlans,
  "performance/inefficient-query.executionStats.json":
    inefficientQueryExecStats,
  "performance/inefficient-query.queryPlanner.json":
    inefficientQueryQueryPlanner,
  "performance/sort-with-index.allPlansExecution.json": sortWithIndexAllPlans,
  "performance/sort-with-index.executionStats.json": sortWithIndexExecStats,
  "performance/sort-with-index.queryPlanner.json": sortWithIndexQueryPlanner,
  "performance/sort-without-index.allPlansExecution.json":
    sortWithoutIndexAllPlans,
  "performance/sort-without-index.executionStats.json":
    sortWithoutIndexExecStats,
  "performance/sort-without-index.queryPlanner.json":
    sortWithoutIndexQueryPlanner,

  "complex/aggregation-pipeline.allPlansExecution.json":
    aggregationPipelineAllPlans,
  "complex/aggregation-pipeline.executionStats.json":
    aggregationPipelineExecStats,
  "complex/aggregation-pipeline.queryPlanner.json":
    aggregationPipelineQueryPlanner,
  "complex/array-operations.allPlansExecution.json": arrayOperationsAllPlans,
  "complex/array-operations.executionStats.json": arrayOperationsExecStats,
  "complex/array-operations.queryPlanner.json": arrayOperationsQueryPlanner,
  "complex/deep-nesting.allPlansExecution.json": deepNestingAllPlans,
  "complex/deep-nesting.executionStats.json": deepNestingExecStats,
  "complex/deep-nesting.queryPlanner.json": deepNestingQueryPlanner,
  "complex/large-in-clause.allPlansExecution.json": largeInClauseAllPlans,
  "complex/large-in-clause.executionStats.json": largeInClauseExecStats,
  "complex/large-in-clause.queryPlanner.json": largeInClauseQueryPlanner,
  "complex/lookup-join.allPlansExecution.json": lookupJoinAllPlans,
  "complex/lookup-join.executionStats.json": lookupJoinExecStats,
  "complex/lookup-join.queryPlanner.json": lookupJoinQueryPlanner,
  "complex/or-operation.allPlansExecution.json": orOperationAllPlans,
  "complex/or-operation.executionStats.json": orOperationExecStats,
  "complex/or-operation.queryPlanner.json": orOperationQueryPlanner,
  "complex/text-search.allPlansExecution.json": textSearchAllPlans,
  "complex/text-search.executionStats.json": textSearchExecStats,
  "complex/text-search.queryPlanner.json": textSearchQueryPlanner,
  "complex/unwind-with-group.allPlansExecution.json": unwindWithGroupAllPlans,
  "complex/unwind-with-group.executionStats.json": unwindWithGroupExecStats,
  "complex/unwind-with-group.queryPlanner.json": unwindWithGroupQueryPlanner,
};

/**
 * Get all fixture keys
 */
export function getFixtureKeys(): string[] {
  return Object.keys(fixtures);
}

/**
 * Get a fixture by key, throws if not found
 */
export function getFixture(key: string): unknown {
  const fixture = fixtures[key];
  if (fixture === undefined) {
    throw new Error(`Fixture not found: ${key}`);
  }
  return fixture;
}
