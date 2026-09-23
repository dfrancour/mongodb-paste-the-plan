import type { WorkloadAnalyzer } from "../types";

const DOMINANT_NAMESPACE_THRESHOLD = 0.5;

/** One collection accounts for most of the slow-log time. */
export const dominantNamespace: WorkloadAnalyzer = {
  id: "workload:dominant_namespace",
  analyze: ({ entries, summary }) => {
    const total = summary.durationTotal;
    if (!total) return [];
    const byNamespace = new Map<string, number>();
    for (const entry of entries) {
      const duration = entry.metrics.durationMillis;
      if (duration === undefined) continue;
      byNamespace.set(
        entry.namespace,
        (byNamespace.get(entry.namespace) ?? 0) + duration,
      );
    }
    const [namespace, time] =
      [...byNamespace.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    if (namespace === undefined || time === undefined) return [];
    const share = time / total;
    if (share < DOMINANT_NAMESPACE_THRESHOLD || byNamespace.size < 2) return [];
    const count = entries.filter((e) => e.namespace === namespace).length;
    return [
      {
        id: "dominant-namespace",
        analyzerId: dominantNamespace.id,
        layer: "workload",
        severity: "info",
        category: "performance",
        title: `${namespace} dominates`,
        description: `${Math.round(share * 100)}% of cumulative time, across ${count.toLocaleString()} entries, is on ${namespace}.`,
      },
    ];
  },
};
