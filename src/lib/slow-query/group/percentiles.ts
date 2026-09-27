/** Nearest-rank percentile over an ascending-sorted array. */
export function percentile(
  sortedAscending: readonly number[],
  p: number,
): number | undefined {
  if (sortedAscending.length === 0) return undefined;
  const rank = Math.ceil((p / 100) * sortedAscending.length);
  const index = Math.min(sortedAscending.length - 1, Math.max(0, rank - 1));
  return sortedAscending[index];
}
