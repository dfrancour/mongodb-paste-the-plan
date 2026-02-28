/**
 * Shared sort stage fields used by SORT, SORT_SIMPLE, and SORT_DEFAULT.
 *
 * Source: plan_explainer_impl.cpp — SortStats struct (plan_stats.h:820)
 * All three sort variants share the same serialization path.
 */
import type { ExplainFieldDeclaration } from "../types";
import { SPILLING_FIELDS } from "./spilling";

export const SORT_STAGE_FIELDS: readonly ExplainFieldDeclaration[] = [
  {
    bsonKey: "sortPattern",
    description: "Sort key specification",
    valueType: "object",
    verbosity: "queryPlanner",
  },
  {
    bsonKey: "memLimit",
    description: "Memory limit for in-memory sort",
    valueType: "number",
    verbosity: "queryPlanner",
    cppName: "maxMemoryUsageBytes",
    unit: "bytes",
  },
  {
    bsonKey: "limitAmount",
    description: "Maximum number of results to sort",
    valueType: "number",
    verbosity: "queryPlanner",
    cppName: "limit",
    unit: "count",
  },
  {
    bsonKey: "type",
    description: "Sort algorithm used (simple or default)",
    valueType: "string",
    verbosity: "queryPlanner",
  },
  {
    bsonKey: "totalDataSizeSorted",
    description: "Total bytes of data sorted",
    valueType: "number",
    verbosity: "executionStats",
    cppName: "totalDataSizeBytes",
    unit: "bytes",
  },
  ...SPILLING_FIELDS,
] as const;
