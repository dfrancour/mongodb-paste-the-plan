import type { EntryAnalyzer } from "../types";

/** A read that scanned the collection instead of using an index. */
export const collectionScan: EntryAnalyzer = {
  id: "entry:collection_scan",
  label: "Collection scan",
  analyze: (entry) => {
    const stages = entry.planSummaryStages;
    const scans = stages.filter((s) => s.stage === "COLLSCAN").length;
    if (scans === 0) return [];
    const docs = entry.metrics.docsExamined;
    return [
      {
        id: "collection-scan",
        analyzerId: collectionScan.id,
        layer: "entry",
        severity: docs !== undefined && docs >= 10_000 ? "critical" : "warning",
        category: "indexUsage",
        title: scans > 1 ? `${scans} collection scans` : "Collection scan",
        description:
          docs === undefined
            ? "The plan summary reports COLLSCAN: no index served this query."
            : `The plan summary reports COLLSCAN and ${docs.toLocaleString()} documents were examined.`,
        suggestion:
          "Create an index that covers the query's equality predicates first, then sort keys, then range predicates.",
      },
    ];
  },
};
