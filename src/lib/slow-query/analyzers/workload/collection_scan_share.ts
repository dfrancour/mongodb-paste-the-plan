import type { WorkloadAnalyzer } from "../types";

const COLLECTION_SCAN_SHARE_THRESHOLD = 0.3;

/** A large share of slow entries ran without an index. */
export const collectionScanShare: WorkloadAnalyzer = {
  id: "workload:collection_scan_share",
  analyze: ({ summary }) => {
    if (summary.entryCount === 0) return [];
    const share = summary.collectionScanCount / summary.entryCount;
    if (share < COLLECTION_SCAN_SHARE_THRESHOLD) return [];
    return [
      {
        id: "collection-scan-share",
        analyzerId: collectionScanShare.id,
        layer: "workload",
        severity: share >= 0.6 ? "warning" : "info",
        category: "indexUsage",
        title: `${Math.round(share * 100)}% collection scans`,
        description: `${summary.collectionScanCount.toLocaleString()} of ${summary.entryCount.toLocaleString()} entries report COLLSCAN in their plan summary.`,
      },
    ];
  },
};
