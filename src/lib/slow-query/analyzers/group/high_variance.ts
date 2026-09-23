import type { GroupAnalyzer } from "../types";

const HIGH_VARIANCE_MIN_COUNT = 10;
const HIGH_VARIANCE_P95_TO_P50 = 5;

/** The same group is usually fast but sometimes very slow. */
export const highVariance: GroupAnalyzer = {
  id: "group:high_variance",
  analyze: (group) => {
    const { count, durationP50, durationP95 } = group.stats;
    if (
      count < HIGH_VARIANCE_MIN_COUNT ||
      !durationP50 ||
      durationP95 === undefined
    ) {
      return [];
    }
    if (durationP95 < durationP50 * HIGH_VARIANCE_P95_TO_P50) return [];
    return [
      {
        id: "high-variance",
        analyzerId: highVariance.id,
        layer: "group",
        severity: "info",
        category: "queryPattern",
        title: "Inconsistent duration",
        description: `p95 is ${Math.round(durationP95 / durationP50)}× the median (${Math.round(durationP50)} ms vs ${Math.round(durationP95)} ms).`,
        suggestion:
          "Occasional slowness usually means different values pick different plans, cache misses, or contention; compare the slow entries' plan summaries to the fast ones.",
      },
    ];
  },
};
