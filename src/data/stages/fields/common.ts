/**
 * Engine-specific common fields that appear on every execution stage.
 *
 * These fields are emitted by the explain framework itself, not by
 * individual stage implementations. Every stage gets them automatically.
 */
import type { ExplainFieldDeclaration, ExplainFieldSection } from "../types";

/**
 * Shared docsExamined field used by stages that examine documents (COLLSCAN, FETCH, DISTINCT_SCAN).
 * TEXT_OR has its own variant with cppName: "fetches" and different semantics.
 */
export const DOCS_EXAMINED_FIELD: ExplainFieldDeclaration = {
  bsonKey: "docsExamined",
  description: "Number of documents examined",
  valueType: "number",
  verbosity: "executionStats",
  unit: "count",
} as const;

/**
 * Classic engine common fields.
 * Source: plan_explainer_impl.cpp statsToBSON() lines 250-311
 */
/** Helper to reduce repetition when annotating engine internal fields */
const ENGINE: { readonly section: ExplainFieldSection } = {
  section: "engine",
} as const;

export const CLASSIC_COMMON_FIELDS: readonly ExplainFieldDeclaration[] = [
  {
    bsonKey: "nReturned",
    description: "Documents returned by this stage",
    valueType: "number",
    verbosity: "executionStats",
    cppName: "advanced",
    unit: "count",
  },
  {
    bsonKey: "executionTimeMillisEstimate",
    description: "Estimated execution time",
    valueType: "number",
    verbosity: "executionStats",
    unit: "ms",
  },
  {
    ...ENGINE,
    bsonKey: "works",
    description: "Work cycles performed",
    valueType: "number",
    verbosity: "executionStats",
    unit: "count",
  },
  {
    ...ENGINE,
    bsonKey: "advanced",
    description: "Times this stage produced a result to its parent",
    valueType: "number",
    verbosity: "executionStats",
    unit: "count",
  },
  {
    ...ENGINE,
    bsonKey: "needTime",
    description: "Work cycles that did not produce a result",
    valueType: "number",
    verbosity: "executionStats",
    unit: "count",
  },
  {
    ...ENGINE,
    bsonKey: "needYield",
    description: "Times this stage yielded its lock",
    valueType: "number",
    verbosity: "executionStats",
    unit: "count",
  },
  {
    ...ENGINE,
    bsonKey: "saveState",
    description: "Times execution state was saved (yields)",
    valueType: "number",
    verbosity: "executionStats",
    cppName: "yields",
    unit: "count",
  },
  {
    ...ENGINE,
    bsonKey: "restoreState",
    description: "Times execution state was restored after yield",
    valueType: "number",
    verbosity: "executionStats",
    cppName: "unyields",
    unit: "count",
  },
  {
    ...ENGINE,
    bsonKey: "isEOF",
    description: "Whether this stage has exhausted its input",
    valueType: "number", // MongoDB renders as 0 (false) or 1 (true)
    verbosity: "executionStats",
  },
] as const;

/**
 * SBE engine common fields.
 * Source: plan_explainer_sbe.cpp statsToBSONHelper() lines 97-145
 */
export const SBE_COMMON_FIELDS: readonly ExplainFieldDeclaration[] = [
  {
    ...ENGINE,
    bsonKey: "planNodeId",
    description: "Node ID linking execution to query plan",
    valueType: "number",
    verbosity: "executionStats",
  },
  {
    bsonKey: "nReturned",
    description: "Documents returned by this stage",
    valueType: "number",
    verbosity: "executionStats",
    cppName: "advances",
    unit: "count",
  },
  {
    bsonKey: "executionTimeMillisEstimate",
    description: "Estimated execution time",
    valueType: "number",
    verbosity: "executionStats",
    unit: "ms",
  },
  {
    ...ENGINE,
    bsonKey: "opens",
    description: "Times this stage was opened (SBE lifecycle)",
    valueType: "number",
    verbosity: "executionStats",
    unit: "count",
  },
  {
    ...ENGINE,
    bsonKey: "closes",
    description: "Times this stage was closed (SBE lifecycle)",
    valueType: "number",
    verbosity: "executionStats",
    unit: "count",
  },
  {
    ...ENGINE,
    bsonKey: "saveState",
    description: "Times execution state was saved (yields)",
    valueType: "number",
    verbosity: "executionStats",
    cppName: "yields",
    unit: "count",
  },
  {
    ...ENGINE,
    bsonKey: "restoreState",
    description: "Times execution state was restored after yield",
    valueType: "number",
    verbosity: "executionStats",
    cppName: "unyields",
    unit: "count",
  },
  {
    ...ENGINE,
    bsonKey: "isEOF",
    description: "Whether this stage has exhausted its input",
    valueType: "number", // MongoDB renders as 0 (false) or 1 (true)
    verbosity: "executionStats",
  },
] as const;
