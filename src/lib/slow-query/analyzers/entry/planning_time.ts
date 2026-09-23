import type { EntryAnalyzer } from "../types";
import { formatDurationMs } from "#lib/utils/formatters";

/** Share of the total duration spent choosing a plan before this is worth calling out. */
const PLANNING_SHARE_THRESHOLD = 0.25;

/** Time spent selecting a plan rather than running one. */
export const planningTime: EntryAnalyzer = {
  id: "entry:planning_time",
  label: "Planning dominated",
  analyze: (entry) => {
    const { planningTimeMicros, durationMillis } = entry.metrics;
    if (planningTimeMicros === undefined || !durationMillis) return [];
    const planningMs = planningTimeMicros / 1000;
    const share = planningMs / durationMillis;
    if (share < PLANNING_SHARE_THRESHOLD) return [];
    const trial = entry.planCache.fromMultiPlanner
      ? " The multi-planner trialled candidate indexes against real data before choosing one."
      : "";
    return [
      {
        id: "planning-time",
        analyzerId: planningTime.id,
        layer: "entry",
        severity: share >= 0.75 ? "critical" : "warning",
        category: "performance",
        title: "Planning dominated",
        description: `${Math.round(share * 100)}% of durationMillis went to choosing a plan (${formatDurationMs(planningMs)} planningTimeMicros).${trial}`,
        suggestion:
          "Several indexes compete for this shape. Make one clearly better, drop the others, or hint it so the plan cache is used.",
      },
    ];
  },
};
