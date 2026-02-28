/**
 * Cost-Based Ranker fields.
 *
 * CBR is not yet GA — these are infrastructure for when it ships.
 * Source: plan_explainer_impl.cpp lines 260-274
 *
 * These fields appear when the cost-based ranker provides estimates for a node.
 */
import type { ExplainFieldDeclaration } from "../types";

export const CBR_FIELDS: readonly ExplainFieldDeclaration[] = [
  {
    bsonKey: "costEstimate",
    description: "Estimated cost from the cost-based ranker",
    valueType: "number",
    verbosity: "queryPlanner",
  },
  {
    bsonKey: "cardinalityEstimate",
    description: "Estimated output cardinality",
    valueType: "number",
    verbosity: "queryPlanner",
  },
  {
    bsonKey: "numKeysEstimate",
    description: "Estimated input keys (IXSCAN only)",
    valueType: "number",
    verbosity: "queryPlanner",
  },
  {
    bsonKey: "numDocsEstimate",
    description: "Estimated input documents (non-IXSCAN)",
    valueType: "number",
    verbosity: "queryPlanner",
  },
] as const;
