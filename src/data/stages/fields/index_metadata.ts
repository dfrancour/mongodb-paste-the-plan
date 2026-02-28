/**
 * Shared index metadata fields used by index scan stages.
 *
 * Source: plan_explainer_impl.cpp — shared across IXSCAN, COUNT_SCAN, DISTINCT_SCAN
 * These queryPlanner fields describe the index being scanned.
 */
import type { ExplainFieldDeclaration } from "../types";

export const INDEX_METADATA_FIELDS: readonly ExplainFieldDeclaration[] = [
  {
    bsonKey: "keyPattern",
    description: "Index key specification",
    valueType: "object",
    verbosity: "queryPlanner",
  },
  {
    bsonKey: "indexName",
    description: "Name of the index being scanned",
    valueType: "string",
    verbosity: "queryPlanner",
  },
  {
    bsonKey: "collation",
    description: "Index collation specification",
    valueType: "object",
    verbosity: "queryPlanner",
  },
  {
    bsonKey: "isMultiKey",
    description: "Whether the index is multikey (array fields)",
    valueType: "boolean",
    verbosity: "queryPlanner",
  },
  {
    bsonKey: "multiKeyPaths",
    description: "Paths that cause the index to be multikey",
    valueType: "object",
    verbosity: "queryPlanner",
  },
  {
    bsonKey: "isUnique",
    description: "Whether the index enforces uniqueness",
    valueType: "boolean",
    verbosity: "queryPlanner",
  },
  {
    bsonKey: "isSparse",
    description: "Whether the index is sparse (omits null entries)",
    valueType: "boolean",
    verbosity: "queryPlanner",
  },
  {
    bsonKey: "isPartial",
    description: "Whether the index is partial (filtered)",
    valueType: "boolean",
    verbosity: "queryPlanner",
  },
  {
    bsonKey: "indexVersion",
    description: "B-tree index version",
    valueType: "number",
    verbosity: "queryPlanner",
  },
] as const;
