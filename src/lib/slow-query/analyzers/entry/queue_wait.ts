import type { EntryAnalyzer } from "../types";

/** Share of the total duration spent queued before this is worth calling out. */
const QUEUE_WAIT_SHARE_THRESHOLD = 0.25;

/** Time spent waiting for an execution ticket rather than working (MongoDB 8.0+). */
export const queueWait: EntryAnalyzer = {
  id: "entry:queue_wait",
  label: "Queued before executing",
  analyze: (entry) => {
    const { totalTimeQueuedMicros, durationMillis } = entry.metrics;
    if (totalTimeQueuedMicros === undefined || !durationMillis) return [];
    const queuedMs = totalTimeQueuedMicros / 1000;
    const share = queuedMs / durationMillis;
    if (share < QUEUE_WAIT_SHARE_THRESHOLD) return [];
    return [
      {
        id: "queue-wait",
        analyzerId: queueWait.id,
        layer: "entry",
        severity: share >= 0.5 ? "warning" : "info",
        category: "performance",
        title: "Queued before executing",
        description: `${Math.round(share * 100)}% of durationMillis was spent waiting for an execution ticket (${Math.round(queuedMs)} ms queued).`,
        suggestion:
          "The server was saturated when this ran; the query itself may be fine. Compare workingMillis to durationMillis across the capture.",
      },
    ];
  },
};
