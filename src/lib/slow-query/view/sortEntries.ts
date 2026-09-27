import type { SlowQueryEntry } from "#types/slow-query";
import { documentEfficiencyOf, indexEfficiencyOf } from "../group/metrics";

export type EntrySortKey =
  | "timestamp"
  | "durationMillis"
  | "operation"
  | "namespace"
  | "keysExamined"
  | "docsExamined"
  | "nreturned"
  | "documentEfficiency"
  | "indexEfficiency";

export type SortDirection = "asc" | "desc";

export interface EntrySort {
  readonly key: EntrySortKey;
  readonly direction: SortDirection;
}

export const DEFAULT_ENTRY_SORT: EntrySort = {
  key: "durationMillis",
  direction: "desc",
};

export function sortEntries(
  entries: readonly SlowQueryEntry[],
  sort: EntrySort,
): SlowQueryEntry[] {
  const sign = sort.direction === "asc" ? 1 : -1;
  return [...entries].sort((a, b) => {
    const left = sortValue(a, sort.key);
    const right = sortValue(b, sort.key);
    // Unknown values sort last regardless of direction.
    if (left === undefined) return right === undefined ? 0 : 1;
    if (right === undefined) return -1;
    return compareKnown(left, right) * sign;
  });
}

function sortValue(
  entry: SlowQueryEntry,
  key: EntrySortKey,
): number | string | undefined {
  switch (key) {
    case "timestamp":
      return entry.timestamp?.getTime();
    case "operation":
      return entry.operation;
    case "namespace":
      return entry.namespace;
    case "documentEfficiency":
      return documentEfficiencyOf(entry.metrics);
    case "indexEfficiency":
      return indexEfficiencyOf(entry.metrics);
    default:
      return entry.metrics[key];
  }
}

function compareKnown(a: number | string, b: number | string): number {
  if (typeof a === "string" || typeof b === "string") {
    return String(a).localeCompare(String(b));
  }
  return a === b ? 0 : a < b ? -1 : 1;
}
