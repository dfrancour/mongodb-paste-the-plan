/**
 * Registry of example MongoDB explain plans for professional analysis
 *
 * This module provides metadata and loading utilities for a progressive set of
 * explain plans designed for MongoDB professionals and administrators. Plans
 * are organized by complexity with strategic engine distribution:
 *
 * - Basic: Foundation patterns (All Classic Engine)
 * - Performance: Optimization analysis (2 Classic, 2 SBE)
 * - Complex: Advanced operations and edge cases (2 Classic, 6 SBE)
 *
 * All examples use the Airbnb listingsAndReviews dataset with strategic indexing.
 */

export interface ExamplePlan {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: "basic" | "performance" | "complex";
  readonly fixtureKey: string;
  readonly highlights: readonly string[];
}

/**
 * Comprehensive registry of example plans with educational context
 */
export const EXAMPLE_PLANS: readonly ExamplePlan[] = [
  // Basic Operations (All Classic Engine)
  {
    id: "collection-scan",
    name: "Collection Scan",
    description:
      "COLLSCAN with poor document efficiency: 58 returned / 5555 examined (Classic Engine)",
    category: "basic",
    fixtureKey: "basic/collection-scan.executionStats.json",
    highlights: [
      "Classic execution",
      "COLLSCAN stage",
      "Poor document efficiency (1%)",
      "Most basic pattern",
    ],
  },
  {
    id: "simple-index-scan",
    name: "Simple Index Scan",
    description: "FETCH → IXSCAN pattern with room_type index (Classic Engine)",
    category: "basic",
    fixtureKey: "basic/simple-index-scan.executionStats.json",
    highlights: [
      "Classic execution",
      "FETCH → IXSCAN pattern",
      "Index Efficiency",
      "Foundation concept",
    ],
  },
  {
    id: "index-with-fetch",
    name: "Index + Document Fetch",
    description:
      "PROJECTION_SIMPLE → FETCH → IXSCAN for non-covered queries (Classic Engine)",
    category: "basic",
    fixtureKey: "basic/index-with-fetch.executionStats.json",
    highlights: [
      "Classic execution",
      "Three-stage pattern",
      "Document retrieval",
      "Non-covered query",
    ],
  },
  {
    id: "compound-index",
    name: "Compound Index Usage",
    description: "Multi-field index with ESR pattern (Classic Engine)",
    category: "basic",
    fixtureKey: "basic/compound-index.executionStats.json",
    highlights: [
      "Classic execution",
      "Compound index",
      "ESR pattern",
      "Multi-field filtering",
    ],
  },

  // Performance Analysis (2 Classic, 2 SBE)
  {
    id: "covered-query",
    name: "Covered Query Optimization",
    description:
      "PROJECTION_COVERED → IXSCAN with zero document fetch (Classic Engine)",
    category: "performance",
    fixtureKey: "performance/covered-query.executionStats.json",
    highlights: [
      "Classic execution",
      "PROJECTION_COVERED",
      "Zero docs examined",
      "Optimal performance",
    ],
  },
  {
    id: "inefficient-query",
    name: "Poor Document Efficiency Pattern",
    description:
      "COLLSCAN with poor document efficiency ratio (Classic Engine)",
    category: "performance",
    fixtureKey: "performance/inefficient-query.executionStats.json",
    highlights: [
      "Classic execution",
      "Poor document efficiency",
      "High docs examined",
      "Performance anti-pattern",
    ],
  },
  {
    id: "sort-with-index",
    name: "Index-Supported Sorting",
    description: "Sort using index order - no SORT stage needed (SBE Engine)",
    category: "performance",
    fixtureKey: "performance/sort-with-index.executionStats.json",
    highlights: [
      "SBE execution",
      "Index-supported sort",
      "No SORT stage",
      "SBE optimization",
    ],
  },
  {
    id: "sort-without-index",
    name: "In-Memory Sort Operation",
    description: "Explicit SORT stage for unindexed field sorting (SBE Engine)",
    category: "performance",
    fixtureKey: "performance/sort-without-index.executionStats.json",
    highlights: [
      "SBE execution",
      "Explicit SORT stage",
      "Complex SBE stages",
      "Memory usage",
    ],
  },

  // Complex Operations (2 Classic, 6 SBE)
  {
    id: "or-operation",
    name: "OR Query Multi-Path",
    description: "OR operation with SUBPLAN coordination (Classic Engine)",
    category: "complex",
    fixtureKey: "complex/or-operation.executionStats.json",
    highlights: [
      "Classic execution",
      "SUBPLAN coordination",
      "Multiple IXSCAN",
      "OR logic",
    ],
  },
  {
    id: "text-search",
    name: "Full-Text Search",
    description: "TEXT index search with relevance scoring (SBE Engine)",
    category: "complex",
    fixtureKey: "complex/text-search.executionStats.json",
    highlights: [
      "SBE execution",
      "TEXT stages",
      "Search relevance",
      "Text processing",
    ],
  },
  {
    id: "array-operations",
    name: "Array Field Operations",
    description:
      "Complex array conditions with $expr and $size (Classic Engine)",
    category: "complex",
    fixtureKey: "complex/array-operations.executionStats.json",
    highlights: [
      "Classic execution",
      "Array processing",
      "$expr evaluation",
      "Complex expressions",
    ],
  },
  {
    id: "aggregation-pipeline",
    name: "Aggregation Pipeline",
    description: "Multi-stage aggregation with $group and $sort (SBE Engine)",
    category: "complex",
    fixtureKey: "complex/aggregation-pipeline.executionStats.json",
    highlights: [
      "SBE execution",
      "Pipeline stages",
      "GROUP operations",
      "Aggregation optimization",
    ],
  },
  {
    id: "lookup-join",
    name: "$lookup Join Operation",
    description: "Collection join with EQ_LOOKUP stage (SBE Engine)",
    category: "complex",
    fixtureKey: "complex/lookup-join.executionStats.json",
    highlights: [
      "SBE execution",
      "EQ_LOOKUP stage",
      "Join operation",
      "Vectorized processing",
    ],
  },
  {
    id: "unwind-with-group",
    name: "Array Processing Pipeline",
    description: "$unwind → $group → $sort pipeline (SBE Engine)",
    category: "complex",
    fixtureKey: "complex/unwind-with-group.executionStats.json",
    highlights: [
      "SBE execution",
      "UNWIND stages",
      "Array expansion",
      "Pipeline optimization",
    ],
  },
  {
    id: "deep-nesting",
    name: "Complex Document Traversal",
    description: "Nested field access with complex filtering (SBE Engine)",
    category: "complex",
    fixtureKey: "complex/deep-nesting.executionStats.json",
    highlights: [
      "SBE execution",
      "Nested field access",
      "Complex filtering",
      "Document traversal",
    ],
  },
  {
    id: "large-in-clause",
    name: "Bulk Set Operations",
    description: "Large $in clause with multiple property types (SBE Engine)",
    category: "complex",
    fixtureKey: "complex/large-in-clause.executionStats.json",
    highlights: [
      "SBE execution",
      "Large $in clause",
      "Set operations",
      "Index Efficiency",
    ],
  },
] as const;

/**
 * Get plans by category for organized display
 */
export function getPlansByCategory(
  category: ExamplePlan["category"],
): readonly ExamplePlan[] {
  return EXAMPLE_PLANS.filter((plan) => plan.category === category);
}

/**
 * Get plan by ID
 */
export function getPlanById(id: string): ExamplePlan | undefined {
  return EXAMPLE_PLANS.find((plan) => plan.id === id);
}

/**
 * Get all unique categories
 */
export function getCategories(): readonly ExamplePlan["category"][] {
  return ["basic", "performance", "complex"] as const;
}

/**
 * Get category display information
 */
export function getCategoryInfo(category: ExamplePlan["category"]): {
  name: string;
  description: string;
  color: string;
} {
  switch (category) {
    case "basic":
      return {
        name: "Basic Operations",
        description: "Fundamental MongoDB query execution patterns",
        color: "blue",
      };
    case "performance":
      return {
        name: "Performance Scenarios",
        description: "Examples showing optimal and problematic query patterns",
        color: "green",
      };
    case "complex":
      return {
        name: "Complex Operations",
        description:
          "Advanced queries with aggregations and multi-stage operations",
        color: "purple",
      };
  }
}

/**
 * Get additional plan variants for comparison
 * Each plan has 3 variants: queryPlanner, executionStats, allPlansExecution
 */
export function getPlanVariants(planId: string): {
  queryPlanner: string;
  executionStats: string;
  allPlansExecution: string;
} {
  const plan = getPlanById(planId);
  if (!plan) {
    throw new Error(`Plan not found: ${planId}`);
  }

  const basePath = plan.fixtureKey.replace(".executionStats.json", "");

  return {
    queryPlanner: `${basePath}.queryPlanner.json`,
    executionStats: `${basePath}.executionStats.json`,
    allPlansExecution: `${basePath}.allPlansExecution.json`,
  };
}
