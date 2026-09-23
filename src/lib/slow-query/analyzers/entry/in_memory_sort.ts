import type { EntryAnalyzer } from "../types";

/** The server sorted results in memory instead of reading them in index order. */
export const inMemorySort: EntryAnalyzer = {
  id: "entry:in_memory_sort",
  label: "In-memory sort",
  analyze: (entry) => {
    if (!entry.flags.hasSortStage) return [];
    return [
      {
        id: "in-memory-sort",
        analyzerId: inMemorySort.id,
        layer: "entry",
        severity: entry.flags.usedDisk ? "critical" : "warning",
        category: "memoryUsage",
        title: "In-memory sort",
        description: entry.flags.usedDisk
          ? "hasSortStage is set and the sort spilled to disk (usedDisk)."
          : "hasSortStage is set: the sort was not satisfied by an index.",
        suggestion:
          "Add the sort keys to the index after the equality fields so results come back in index order.",
      },
    ];
  },
};
