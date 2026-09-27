import type { EntryAnalyzer } from "../types";

/** A stage exceeded its memory limit and wrote temporary files. */
export const diskUse: EntryAnalyzer = {
  id: "entry:disk_use",
  label: "Spilled to disk",
  analyze: (entry) => {
    if (!entry.flags.usedDisk || entry.flags.hasSortStage) return [];
    return [
      {
        id: "disk-use",
        analyzerId: diskUse.id,
        layer: "entry",
        severity: "warning",
        category: "memoryUsage",
        title: "Spilled to disk",
        description:
          "usedDisk is set: a blocking stage such as $group or $sort exceeded its memory limit.",
        suggestion:
          "Reduce the working set with an earlier $match or $project, or add an index that supports the blocking stage.",
      },
    ];
  },
};
