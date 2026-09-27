/**
 * Types for the Slow Query Explorer.
 *
 * A `SlowQueryEntry` is one normalized "Slow query" log record. Metrics are
 * `undefined` when the server did not record them: logs vary by version and
 * operation type, and "not recorded" must never read as zero.
 */

export const OPERATION_KINDS = [
  "find",
  "aggregate",
  "getMore",
  "count",
  "distinct",
  "findAndModify",
  "update",
  "delete",
  "insert",
  "bulkWrite",
  "command",
] as const;

export type OperationKind = (typeof OPERATION_KINDS)[number];

/** One token of a `planSummary` string, e.g. `IXSCAN { status: 1 }`. */
export interface PlanSummaryStage {
  readonly stage: string;
  readonly keyPattern?: string;
}

export interface EntryMetrics {
  readonly durationMillis?: number;
  readonly workingMillis?: number;
  readonly cpuNanos?: number;
  readonly planningTimeMicros?: number;
  readonly keysExamined?: number;
  readonly docsExamined?: number;
  readonly nreturned?: number;
  readonly numYields?: number;
  readonly reslen?: number;
  readonly nBatches?: number;
  readonly bytesRead?: number;
  readonly timeReadingMicros?: number;
  readonly totalTimeQueuedMicros?: number;
  readonly writeConflicts?: number;
  readonly nMatched?: number;
  readonly nModified?: number;
  readonly nUpserted?: number;
  readonly ndeleted?: number;
  readonly ninserted?: number;
}

export interface PlanCacheInfo {
  readonly fromPlanCache?: boolean;
  readonly fromMultiPlanner?: boolean;
  readonly replanned?: boolean;
  readonly replanReason?: string;
  readonly queryHash?: string;
  readonly planCacheKey?: string;
  readonly queryShapeHash?: string;
  readonly planCacheShapeHash?: string;
  readonly queryFramework?: string;
}

export interface EntryFlags {
  readonly hasSortStage: boolean;
  readonly usedDisk: boolean;
  readonly cursorExhausted: boolean;
  readonly fromMongos: boolean;
  readonly needsMerge: boolean;
  readonly isCursorBatch: boolean;
  readonly isTruncated: boolean;
}

/**
 * Locally computed query shape. A heuristic, not MongoDB's own algorithm:
 * predicate and option values become type tokens, sorts keep their order,
 * unknown operators stay exact, and per-request keys such as `batchSize`
 * and `txnNumber` are left out.
 */
export interface QueryShape {
  /** Canonical JSON string; equal strings mean equal shapes. */
  readonly key: string;
  /** The command in a few words: pipeline stages, predicate keys, or the command name. */
  readonly summary: string;
  /** Parsed canonical form, for display. */
  readonly canonical: Record<string, unknown>;
}

export interface SlowQueryEntry {
  /** Position in load order; stable identifier within one load. */
  readonly id: number;
  readonly timestamp?: Date;
  readonly operation: OperationKind;
  /** For cursor batches, the operation that opened the cursor. */
  readonly logicalOperation: OperationKind;
  /** The command's own name (`find`, `createIndexes`, ...); for cursor batches, the originating command's. */
  readonly commandName: string;
  readonly namespace: string;
  /** Command with session and routing noise removed. */
  readonly command: Record<string, unknown>;
  readonly originatingCommand?: Record<string, unknown>;
  readonly comment?: string;
  readonly appName?: string;
  readonly remote?: string;
  readonly planSummary?: string;
  readonly planSummaryStages: readonly PlanSummaryStage[];
  readonly metrics: EntryMetrics;
  readonly planCache: PlanCacheInfo;
  readonly flags: EntryFlags;
  readonly shape: QueryShape;
  /** The original record, untouched. */
  readonly raw: unknown;
}

/** `malformed` is a slow-query line whose attributes have unexpected types. */
export type SkipReason = "notSlowQuery" | "notAnObject" | "malformed";

export interface SlowQueryLoadResult {
  readonly entries: readonly SlowQueryEntry[];
  readonly skipped: Readonly<Record<SkipReason, number>>;
  /** 1-based line numbers that were not valid JSON. */
  readonly invalidLines: readonly number[];
}
