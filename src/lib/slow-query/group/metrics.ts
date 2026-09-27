import type { EntryMetrics, SlowQueryEntry } from "#types/slow-query";

/** Sum of recorded values; undefined when nothing was recorded. */
export function sumKnown(
  entries: readonly SlowQueryEntry[],
  metric: keyof EntryMetrics,
): number | undefined {
  let sum: number | undefined;
  for (const entry of entries) {
    const value = entry.metrics[metric];
    if (value !== undefined) sum = (sum ?? 0) + value;
  }
  return sum;
}

export function knownValues(
  entries: readonly SlowQueryEntry[],
  metric: keyof EntryMetrics,
): number[] {
  const values: number[] = [];
  for (const entry of entries) {
    const value = entry.metrics[metric];
    if (value !== undefined) values.push(value);
  }
  return values;
}

/**
 * `nreturned / examined`, the same ratio Paste the Plan reports as document
 * and index efficiency. Undefined when either side is unknown or nothing
 * was examined.
 */
export function efficiency(
  returned: number | undefined,
  examined: number | undefined,
): number | undefined {
  if (returned === undefined || examined === undefined || examined === 0) {
    return undefined;
  }
  return returned / examined;
}

export function documentEfficiencyOf(
  metrics: EntryMetrics,
): number | undefined {
  return efficiency(metrics.nreturned, metrics.docsExamined);
}

export function indexEfficiencyOf(metrics: EntryMetrics): number | undefined {
  return efficiency(metrics.nreturned, metrics.keysExamined);
}
