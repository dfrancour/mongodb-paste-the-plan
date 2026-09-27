import { isRecord, type UnknownRecord } from "../objects";

/** Command keys that carry session, routing, or cluster metadata, not query intent. */
export const NOISE_KEYS: ReadonlySet<string> = new Set([
  "lsid",
  "$clusterTime",
  "$configTime",
  "$topologyTime",
  "$audit",
  "$client",
  "mayBypassWriteBlocking",
  "shardVersion",
  "databaseVersion",
  "clientOperationKey",
  "fromMongos",
  "$db",
  "includeQueryStatsMetrics",
  "needsMerge",
  "$readPreference",
  "apiVersion",
  "apiStrict",
]);

export function stripNoise(command: unknown): UnknownRecord {
  if (!isRecord(command)) return {};
  const out: UnknownRecord = {};
  for (const [key, value] of Object.entries(command)) {
    if (!NOISE_KEYS.has(key)) out[key] = value;
  }
  return out;
}
