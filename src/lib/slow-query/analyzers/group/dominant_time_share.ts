import type { GroupAnalyzer } from "../types";

const DOMINANT_TIME_SHARE_THRESHOLD = 0.25;

/** One group accounts for a large share of the cumulative time in its breakdown. */
export const dominantTimeShare: GroupAnalyzer = {
  id: "group:dominant_time_share",
  analyze: (group) => {
    const share = group.stats.timeShare;
    if (share === undefined || share < DOMINANT_TIME_SHARE_THRESHOLD) return [];
    return [
      {
        id: "dominant-time-share",
        analyzerId: dominantTimeShare.id,
        layer: "group",
        severity: share >= 0.5 ? "warning" : "info",
        category: "performance",
        title: `${Math.round(share * 100)}% of cumulative time`,
        description: `${group.stats.count.toLocaleString()} entries in this group account for ${Math.round(share * 100)}% of the slow-log time in this breakdown.`,
      },
    ];
  },
};
