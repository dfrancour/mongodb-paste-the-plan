import { isRecord } from "../objects";

/**
 * Parse the `t` field of a structured log record. Accepts `{ $date: ISO }`,
 * `{ $date: millis }` (after Extended JSON conversion), an ISO string, or
 * epoch milliseconds.
 */
export function parseLogTimestamp(value: unknown): Date | undefined {
  const inner = isRecord(value) ? value.$date : value;
  if (typeof inner !== "string" && typeof inner !== "number") return undefined;
  const date = new Date(inner);
  return Number.isFinite(date.getTime()) ? date : undefined;
}
