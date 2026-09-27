import type { EntryAnalyzer } from "../types";

/** The cached plan was discarded and the query re-planned. */
export const replanned: EntryAnalyzer = {
  id: "entry:replanned",
  label: "Plan cache replan",
  analyze: (entry) => {
    if (entry.planCache.replanned !== true) return [];
    const reason = entry.planCache.replanReason;
    return [
      {
        id: "replanned",
        analyzerId: replanned.id,
        layer: "entry",
        severity: "info",
        category: "queryPattern",
        title: "Plan cache replan",
        description: reason
          ? `The cached plan was discarded: ${reason}.`
          : "The cached plan was discarded and the query re-planned.",
        suggestion:
          "Frequent replans for one shape suggest the best index depends on the values; consider separate indexes or a hint.",
      },
    ];
  },
};
