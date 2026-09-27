import type {
  EntryFlags,
  EntryMetrics,
  PlanCacheInfo,
  SlowQueryEntry,
} from "#types/slow-query";
import {
  isRecord,
  nonNegativeNumber,
  optionalString,
  type UnknownRecord,
} from "../objects";
import { buildQueryShape } from "../shape/queryShape";
import { stripNoise } from "./noiseKeys";
import { commandNameOf, identifyOperation } from "./operation";
import { parsePlanSummary } from "./planSummary";
import type { SlowQueryAttr, SlowQueryRecord } from "./schema";
import { parseLogTimestamp } from "./timestamp";

const NAMESPACE_NOT_RECORDED = "(namespace not recorded)";

export function normalizeEntry(
  record: SlowQueryRecord,
  raw: unknown,
  id: number,
): SlowQueryEntry {
  const attr = record.attr;
  const rawCommand = attr.command ?? {};
  const operation = identifyOperation(rawCommand, attr.type);
  const isCursorBatch = operation === "getMore";
  const originating =
    isCursorBatch && attr.originatingCommand
      ? attr.originatingCommand
      : undefined;
  const logicalCommand = originating ?? rawCommand;
  const logicalOperation = originating
    ? identifyOperation(originating, undefined)
    : operation;
  const namespace = resolveNamespace(attr, logicalCommand, logicalOperation);
  const commandName = commandNameOf(logicalCommand, logicalOperation);
  const command = stripNoise(rawCommand);
  const isTruncated =
    record.truncated !== undefined || Object.hasOwn(rawCommand, "$truncated");
  const planSummary = attr.planSummary;

  return {
    id,
    timestamp: parseLogTimestamp(record.t),
    operation,
    logicalOperation,
    commandName,
    namespace,
    command,
    originatingCommand: originating ? stripNoise(originating) : undefined,
    comment: readText(rawCommand.comment ?? originating?.comment),
    appName: readText(attr.appName),
    remote: attr.remote,
    planSummary,
    planSummaryStages: planSummary ? parsePlanSummary(planSummary) : [],
    metrics: readMetrics(attr),
    planCache: readPlanCache(attr),
    flags: readFlags(attr, isCursorBatch, isTruncated),
    shape: buildQueryShape({
      command: stripNoise(logicalCommand),
      operation: logicalOperation,
      commandName,
      namespace,
      entryId: id,
      singleton:
        isTruncated ||
        Object.keys(rawCommand).length === 0 ||
        (isCursorBatch && !originating),
    }),
    raw,
  };
}

/**
 * Prefer the recorded `ns`. Write commands are logged against `db.$cmd`, so
 * for those the collection comes from the command itself.
 */
function resolveNamespace(
  attr: SlowQueryAttr,
  command: UnknownRecord,
  operation: string,
): string {
  const collection = command[operation];
  if (attr.ns) {
    if (attr.ns.endsWith(".$cmd") && typeof collection === "string") {
      return `${attr.ns.slice(0, -".$cmd".length)}.${collection}`;
    }
    return attr.ns;
  }
  const db = command.$db;
  return typeof db === "string" && typeof collection === "string"
    ? `${db}.${collection}`
    : NAMESPACE_NOT_RECORDED;
}

/** A string as is; any other present value as its JSON. */
function readText(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  return typeof value === "string" ? value : JSON.stringify(value);
}

function readMetrics(attr: SlowQueryAttr): EntryMetrics {
  return compact({
    durationMillis: nonNegativeNumber(attr.durationMillis),
    workingMillis: nonNegativeNumber(attr.workingMillis),
    cpuNanos: nonNegativeNumber(attr.cpuNanos),
    planningTimeMicros: nonNegativeNumber(attr.planningTimeMicros),
    keysExamined: nonNegativeNumber(attr.keysExamined),
    docsExamined: nonNegativeNumber(attr.docsExamined),
    nreturned: nonNegativeNumber(attr.nreturned),
    numYields: nonNegativeNumber(attr.numYields),
    reslen: nonNegativeNumber(attr.reslen),
    nBatches: nonNegativeNumber(attr.nBatches),
    bytesRead: nonNegativeNumber(attr.storage?.data?.bytesRead),
    timeReadingMicros: nonNegativeNumber(attr.storage?.data?.timeReadingMicros),
    totalTimeQueuedMicros: nonNegativeNumber(
      attr.queues?.execution?.totalTimeQueuedMicros,
    ),
    writeConflicts: nonNegativeNumber(attr.writeConflicts),
    nMatched: nonNegativeNumber(attr.nMatched),
    nModified: nonNegativeNumber(attr.nModified),
    nUpserted: nonNegativeNumber(attr.nUpserted),
    ndeleted: nonNegativeNumber(attr.ndeleted),
    ninserted: nonNegativeNumber(attr.ninserted),
  });
}

function readPlanCache(attr: SlowQueryAttr): PlanCacheInfo {
  return compact({
    fromPlanCache: attr.fromPlanCache,
    fromMultiPlanner: attr.fromMultiPlanner,
    replanned: attr.replanned,
    replanReason: optionalString(attr.replanReason),
    queryHash: attr.queryHash,
    planCacheKey: attr.planCacheKey,
    queryShapeHash: attr.queryShapeHash,
    planCacheShapeHash: attr.planCacheShapeHash,
    queryFramework: attr.queryFramework,
  });
}

function readFlags(
  attr: SlowQueryAttr,
  isCursorBatch: boolean,
  isTruncated: boolean,
): EntryFlags {
  return {
    hasSortStage: attr.hasSortStage === true,
    usedDisk: attr.usedDisk === true,
    cursorExhausted: attr.cursorExhausted === true,
    fromMongos:
      attr.fromMongos === true ||
      (isRecord(attr.command) && attr.command.fromMongos === true),
    needsMerge:
      attr.needsMerge === true ||
      (isRecord(attr.command) && attr.command.needsMerge === true),
    isCursorBatch,
    isTruncated,
  };
}

/** Drop undefined values so entries serialize and compare cleanly. */
function compact<T extends object>(value: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined) out[key] = item;
  }
  return out as T;
}
