/**
 * Zod schema for a structured "Slow query" log record (MongoDB 4.4+).
 *
 * Loose at every level: MongoDB adds attributes across versions and the
 * normalizer reads only what it knows. Extended JSON numbers are converted
 * before validation, so numeric fields are plain numbers here.
 */

import { z } from "zod";

const unknownRecord = z.record(z.string(), z.unknown());

const attrSchema = z.looseObject({
  type: z.string().optional(),
  ns: z.string().optional(),
  appName: z.unknown().optional(),
  command: unknownRecord.optional(),
  originatingCommand: unknownRecord.optional(),
  planSummary: z.string().optional(),
  durationMillis: z.number().optional(),
  workingMillis: z.number().optional(),
  cpuNanos: z.number().optional(),
  planningTimeMicros: z.number().optional(),
  keysExamined: z.number().optional(),
  docsExamined: z.number().optional(),
  nreturned: z.number().optional(),
  numYields: z.number().optional(),
  reslen: z.number().optional(),
  nBatches: z.number().optional(),
  writeConflicts: z.number().optional(),
  nMatched: z.number().optional(),
  nModified: z.number().optional(),
  nUpserted: z.number().optional(),
  ndeleted: z.number().optional(),
  ninserted: z.number().optional(),
  storage: z
    .looseObject({
      data: z
        .looseObject({
          bytesRead: z.number().optional(),
          timeReadingMicros: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
  queues: z
    .looseObject({
      execution: z
        .looseObject({ totalTimeQueuedMicros: z.number().optional() })
        .optional(),
    })
    .optional(),
  fromPlanCache: z.boolean().optional(),
  fromMultiPlanner: z.boolean().optional(),
  replanned: z.boolean().optional(),
  replanReason: z.string().optional(),
  queryHash: z.string().optional(),
  planCacheKey: z.string().optional(),
  queryShapeHash: z.string().optional(),
  planCacheShapeHash: z.string().optional(),
  queryFramework: z.string().optional(),
  hasSortStage: z.boolean().optional(),
  usedDisk: z.boolean().optional(),
  cursorExhausted: z.boolean().optional(),
  fromMongos: z.boolean().optional(),
  needsMerge: z.boolean().optional(),
  remote: z.string().optional(),
});

export const slowQueryRecordSchema = z.looseObject({
  t: z.unknown().optional(),
  msg: z.string().optional(),
  attr: attrSchema,
  truncated: z.unknown().optional(),
});

export type SlowQueryRecord = z.infer<typeof slowQueryRecordSchema>;
export type SlowQueryAttr = z.infer<typeof attrSchema>;

/**
 * True when a record is a slow-query log line. Accepts the canonical `msg`
 * and, for logs whose message was localized or rewritten, any record whose
 * `attr` carries both a command and a duration.
 */
export function isSlowQueryRecord(record: SlowQueryRecord): boolean {
  if (record.msg === "Slow query") return true;
  const { command, durationMillis } = record.attr;
  return (
    command !== undefined &&
    Object.keys(command).length > 0 &&
    durationMillis !== undefined
  );
}
