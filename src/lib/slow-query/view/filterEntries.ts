import type { SlowQueryEntry } from "#types/slow-query";
import {
  groupDimensionById,
  groupLabelOf,
  type GroupDimension,
  type GroupDimensionId,
} from "../group/dimensions";
import { documentEfficiencyOf } from "../group/metrics";

/** Selected values of one facet: group key → display label. */
export type FacetSelection = ReadonlyMap<string, string>;

export interface TimeWindow {
  readonly start: Date | null;
  readonly end: Date | null;
}

/**
 * Everything the loaded log is scoped to. Within a facet, values are OR;
 * across facets and with every other part, AND.
 */
export interface EntryFilter {
  readonly facets: ReadonlyMap<GroupDimensionId, FacetSelection>;
  /** Analyzer ids; an entry passes when any of them fired for it. */
  readonly findingAnalyzerIds: ReadonlySet<string>;
  readonly minDurationMs: number | null;
  readonly maxDurationMs: number | null;
  readonly minDocsExamined: number | null;
  /** nreturned / docsExamined, 0..1; entries without both metrics are excluded. */
  readonly maxDocumentEfficiency: number | null;
  readonly timeWindow: TimeWindow;
  readonly includeCursorBatches: boolean;
  readonly search: string;
}

export const EMPTY_FILTER: EntryFilter = {
  facets: new Map(),
  findingAnalyzerIds: new Set(),
  minDurationMs: null,
  maxDurationMs: null,
  minDocsExamined: null,
  maxDocumentEfficiency: null,
  timeWindow: { start: null, end: null },
  includeCursorBatches: true,
  search: "",
};

export interface FilterContext {
  readonly searchTextOf: (entry: SlowQueryEntry) => string;
  readonly analyzerIdsOf: (entry: SlowQueryEntry) => ReadonlySet<string>;
}

export function hasActiveFilter(filter: EntryFilter): boolean {
  return (
    [...filter.facets.values()].some((values) => values.size > 0) ||
    filter.findingAnalyzerIds.size > 0 ||
    filter.minDurationMs !== null ||
    filter.maxDurationMs !== null ||
    filter.minDocsExamined !== null ||
    filter.maxDocumentEfficiency !== null ||
    filter.timeWindow.start !== null ||
    filter.timeWindow.end !== null ||
    !filter.includeCursorBatches ||
    filter.search.trim() !== ""
  );
}

export interface FilterOptions {
  /** Skip one facet, to group by it or to count its values. */
  readonly exceptFacet?: GroupDimensionId;
}

export function filterEntries(
  entries: readonly SlowQueryEntry[],
  filter: EntryFilter,
  context: FilterContext,
  options: FilterOptions = {},
): readonly SlowQueryEntry[] {
  const facetTests = [...filter.facets]
    .filter(
      ([dimensionId, values]) =>
        values.size > 0 && dimensionId !== options.exceptFacet,
    )
    .map(([dimensionId, values]) => {
      const keyOf = groupDimensionById(dimensionId).keyOf;
      return (entry: SlowQueryEntry) => values.has(keyOf(entry));
    });
  const needle = filter.search.trim().toLowerCase();
  const {
    findingAnalyzerIds,
    minDurationMs,
    maxDurationMs,
    minDocsExamined,
    maxDocumentEfficiency,
    timeWindow,
    includeCursorBatches,
  } = filter;
  const startMs = timeWindow.start?.getTime();
  const endMs = timeWindow.end?.getTime();

  return entries.filter((entry) => {
    if (!includeCursorBatches && entry.flags.isCursorBatch) return false;
    if (!facetTests.every((test) => test(entry))) return false;
    if (findingAnalyzerIds.size > 0) {
      const fired = context.analyzerIdsOf(entry);
      if (![...findingAnalyzerIds].some((id) => fired.has(id))) return false;
    }
    const { durationMillis, docsExamined } = entry.metrics;
    if (minDurationMs !== null && (durationMillis ?? -1) < minDurationMs)
      return false;
    if (maxDurationMs !== null && (durationMillis ?? Infinity) > maxDurationMs)
      return false;
    if (minDocsExamined !== null && (docsExamined ?? -1) < minDocsExamined)
      return false;
    if (maxDocumentEfficiency !== null) {
      const documentEfficiency = documentEfficiencyOf(entry.metrics);
      if (
        documentEfficiency === undefined ||
        documentEfficiency > maxDocumentEfficiency
      ) {
        return false;
      }
    }
    if (startMs !== undefined || endMs !== undefined) {
      const at = entry.timestamp?.getTime();
      if (at === undefined) return false;
      if (startMs !== undefined && at < startMs) return false;
      if (endMs !== undefined && at > endMs) return false;
    }
    return needle === "" || context.searchTextOf(entry).includes(needle);
  });
}

export function toggleFacetValue(
  filter: EntryFilter,
  dimensionId: GroupDimensionId,
  key: string,
  label: string,
): EntryFilter {
  const current = new Map(filter.facets.get(dimensionId) ?? []);
  if (current.has(key)) current.delete(key);
  else current.set(key, label);
  const facets = new Map(filter.facets);
  if (current.size === 0) facets.delete(dimensionId);
  else facets.set(dimensionId, current);
  return { ...filter, facets };
}

export interface FacetValue {
  readonly key: string;
  readonly label: string;
  readonly count: number;
}

/** Distinct values of a dimension across entries, most frequent first. */
export function facetValues(
  entries: readonly SlowQueryEntry[],
  dimension: GroupDimension,
): FacetValue[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const entry of entries) {
    const key = dimension.keyOf(entry);
    const found = counts.get(key);
    if (found) found.count++;
    else counts.set(key, { label: groupLabelOf(dimension, entry), count: 1 });
  }
  return [...counts]
    .map(([key, { label, count }]) => ({ key, label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
