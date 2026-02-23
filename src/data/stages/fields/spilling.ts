/**
 * Shared spilling fields used by stages that can spill to disk.
 *
 * Source: src/mongo/db/pipeline/spilling/spilling_stats.h
 * Used by: SORT, GEO_NEAR, SPOOL, TEXT_OR, group, hash_lookup, window
 */
import type { ExplainFieldDeclaration } from "../types";

export const SPILLING_FIELDS: readonly ExplainFieldDeclaration[] = [
  {
    bsonKey: "usedDisk",
    description: "Whether this stage spilled to disk",
    valueType: "boolean",
    verbosity: "executionStats",
  },
  {
    bsonKey: "spills",
    description: "Number of times data was spilled to disk",
    valueType: "number",
    verbosity: "executionStats",
    unit: "count",
  },
  {
    bsonKey: "spilledRecords",
    description: "Number of records written to disk during spills",
    valueType: "number",
    verbosity: "executionStats",
    unit: "count",
  },
  {
    bsonKey: "spilledBytes",
    description: "Uncompressed bytes written to disk during spills",
    valueType: "number",
    verbosity: "executionStats",
    unit: "bytes",
  },
  {
    bsonKey: "spilledDataStorageSize",
    description: "Compressed on-disk size of spilled data",
    valueType: "number",
    verbosity: "executionStats",
    unit: "bytes",
  },
] as const;

/**
 * SPOOL's spilling variant — uses spilledUncompressedDataSize instead of spilledBytes.
 *
 * SPOOL has a custom spilling serialization in plan_explainer_impl.cpp:707.
 * The C++ getter is getSpilledBytes() but the BSON key differs from SPILLING_FIELDS.
 */
export const SPOOL_SPILLING_FIELDS: readonly ExplainFieldDeclaration[] = [
  {
    bsonKey: "usedDisk",
    description: "Whether this stage spilled to disk",
    valueType: "boolean",
    verbosity: "executionStats",
  },
  {
    bsonKey: "spills",
    description: "Number of times data was spilled to disk",
    valueType: "number",
    verbosity: "executionStats",
    unit: "count",
  },
  {
    bsonKey: "spilledRecords",
    description: "Number of records written to disk during spills",
    valueType: "number",
    verbosity: "executionStats",
    unit: "count",
  },
  {
    bsonKey: "spilledDataStorageSize",
    description: "Compressed on-disk size of spilled data",
    valueType: "number",
    verbosity: "executionStats",
    unit: "bytes",
  },
  {
    bsonKey: "spilledUncompressedDataSize",
    description: "Uncompressed bytes written to disk during spills",
    valueType: "number",
    verbosity: "executionStats",
    cppName: "getSpilledBytes",
    unit: "bytes",
  },
] as const;
