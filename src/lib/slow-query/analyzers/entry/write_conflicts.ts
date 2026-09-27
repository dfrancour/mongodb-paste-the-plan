import type { EntryAnalyzer } from "../types";

/** A write retried because another operation changed the same document. */
export const writeConflicts: EntryAnalyzer = {
  id: "entry:write_conflicts",
  label: "Write conflicts",
  analyze: (entry) => {
    const conflicts = entry.metrics.writeConflicts;
    if (!conflicts) return [];
    return [
      {
        id: "write-conflicts",
        analyzerId: writeConflicts.id,
        layer: "entry",
        severity: conflicts >= 10 ? "warning" : "info",
        category: "performance",
        title: `${conflicts.toLocaleString()} write conflicts`,
        description:
          "The write retried after another operation modified the same documents.",
        suggestion:
          "Contention on hot documents; consider batching, narrowing the update, or restructuring the document.",
      },
    ];
  },
};
