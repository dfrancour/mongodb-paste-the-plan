import type { QueryGroup } from "../group/groupEntries";
import type { SortDirection } from "./sortEntries";

export type GroupSortKey =
  | "label"
  | "count"
  | "durationTotal"
  | "durationAvg"
  | "durationMax";

export interface GroupSort {
  readonly key: GroupSortKey;
  readonly direction: SortDirection;
}

export const DEFAULT_GROUP_SORT: GroupSort = {
  key: "durationTotal",
  direction: "desc",
};

export function sortGroups(
  groups: readonly QueryGroup[],
  sort: GroupSort,
): QueryGroup[] {
  const sign = sort.direction === "asc" ? 1 : -1;
  return [...groups].sort((a, b) => {
    if (sort.key === "label") return a.label.localeCompare(b.label) * sign;
    const left = a.stats[sort.key];
    const right = b.stats[sort.key];
    // Unknown values sort last regardless of direction.
    if (left === undefined) return right === undefined ? 0 : 1;
    if (right === undefined) return -1;
    return (left === right ? 0 : left < right ? -1 : 1) * sign;
  });
}
