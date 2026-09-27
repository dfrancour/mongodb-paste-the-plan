import type {
  SkipReason,
  SlowQueryEntry,
  SlowQueryLoadResult,
} from "#types/slow-query";
import { transformExtendedJSON } from "#lib/parsers/extendedJson";
import { isRecord } from "../objects";
import { normalizeEntry } from "./normalizeEntry";
import { isSlowQueryRecord, slowQueryRecordSchema } from "./schema";
import { splitRecords } from "./splitRecords";

/**
 * Text in, normalized entries out. Records that are not slow-query lines
 * are counted by reason rather than dropped silently.
 */
export function loadSlowQueryLog(text: string): SlowQueryLoadResult {
  const { records, invalidLines } = splitRecords(text);
  const entries: SlowQueryEntry[] = [];
  const skipped: Record<SkipReason, number> = {
    notSlowQuery: 0,
    notAnObject: 0,
    malformed: 0,
  };
  for (const raw of records) {
    if (!isRecord(raw)) {
      skipped.notAnObject++;
      continue;
    }
    const parsed = slowQueryRecordSchema.safeParse(transformExtendedJSON(raw));
    if (!parsed.success) {
      skipped[raw.msg === "Slow query" ? "malformed" : "notSlowQuery"]++;
      continue;
    }
    if (!isSlowQueryRecord(parsed.data)) {
      skipped.notSlowQuery++;
      continue;
    }
    entries.push(normalizeEntry(parsed.data, raw, entries.length));
  }
  return { entries, skipped, invalidLines };
}
