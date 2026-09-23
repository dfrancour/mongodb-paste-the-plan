import type { GroupAnalyzer } from "../types";

const CONSISTENTLY_UNINDEXED_MIN_COUNT = 3;

/** Every entry in the group ran as a collection scan. */
export const consistentlyUnindexed: GroupAnalyzer = {
  id: "group:consistently_unindexed",
  analyze: (group) => {
    const { count, collectionScanCount } = group.stats;
    if (
      count < CONSISTENTLY_UNINDEXED_MIN_COUNT ||
      collectionScanCount < count
    ) {
      return [];
    }
    return [
      {
        id: "consistently-unindexed",
        analyzerId: consistentlyUnindexed.id,
        layer: "group",
        severity: "warning",
        category: "indexUsage",
        title: "Always a collection scan",
        description: `All ${count.toLocaleString()} entries in this group scanned the collection.`,
        suggestion:
          "A missing index, not an unlucky value. Explain one entry in Paste the Plan to design it.",
      },
    ];
  },
};
