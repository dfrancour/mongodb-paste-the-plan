import type { WorkloadAnalyzer } from "../types";

const CURSOR_BATCH_SHARE_THRESHOLD = 0.5;

/** Most slow entries are getMore batches: large result sets streamed slowly. */
export const cursorBatchShare: WorkloadAnalyzer = {
  id: "workload:cursor_batch_share",
  analyze: ({ summary }) => {
    if (summary.entryCount === 0) return [];
    const share = summary.cursorBatchCount / summary.entryCount;
    if (share < CURSOR_BATCH_SHARE_THRESHOLD) return [];
    return [
      {
        id: "cursor-batch-share",
        analyzerId: cursorBatchShare.id,
        layer: "workload",
        severity: "info",
        category: "queryPattern",
        title: `${Math.round(share * 100)}% cursor batches`,
        description: `${summary.cursorBatchCount.toLocaleString()} of ${summary.entryCount.toLocaleString()} entries are getMore batches.`,
        suggestion:
          "Large result sets dominate; check batchSize, whether clients need every document, and whether a projection or limit would help.",
      },
    ];
  },
};
