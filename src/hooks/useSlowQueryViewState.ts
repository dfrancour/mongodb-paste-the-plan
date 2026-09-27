"use client";

import { useCallback, useMemo, useState } from "react";
import type { SlowQueryEntry } from "#types/slow-query";
import {
  analyzeEntry,
  analyzeGroup,
  analyzeWorkload,
  bucketTimeline,
  DEFAULT_ENTRY_SORT,
  DEFAULT_GROUP_SORT,
  EMPTY_FILTER,
  ENTRY_ANALYZERS,
  entrySearchText,
  facetValues,
  filterEntries,
  groupDimensionById,
  groupEntries,
  groupLabelOf,
  hasActiveFilter,
  recordedDimensions,
  recordedTimelineMetrics,
  sortEntries,
  sortGroups,
  summarizeWorkload,
  timelineMetricById,
  timeSpanOf,
  toggleFacetValue,
  type EntryFilter,
  type EntrySort,
  type FacetValue,
  type GroupDimension,
  type GroupDimensionId,
  type GroupSort,
  type QueryGroup,
  type TimelineMetricId,
} from "#lib/slow-query";

const EMPTY_IDS: ReadonlySet<string> = new Set();
/** A finding as a facet value: the analyzer id is the key. */
export interface FindingOption {
  readonly key: string;
  readonly label: string;
  /** Entries this finding fired for, under every other filter. */
  readonly count: number;
}

export interface Facet {
  readonly dimension: GroupDimension;
  /** Values with counts under every other filter, most frequent first. */
  readonly values: readonly FacetValue[];
}

/**
 * Scope, grouping, sort, and selection over one loaded log. Mount it
 * under a key that changes per load so it starts fresh.
 *
 * The scope narrows everything. Two places set one facet aside: a
 * dimension's facet counts, and the group table when it is grouped by a
 * dimension that has a selection, so its rows stay put and the selected one
 * reads as selected rather than alone.
 */
export function useSlowQueryViewState(entries: readonly SlowQueryEntry[]) {
  const [filter, setFilter] = useState<EntryFilter>(EMPTY_FILTER);
  const [dimensionId, setDimensionId] = useState<GroupDimensionId>("shape");
  const [groupSort, setGroupSort] = useState<GroupSort>(DEFAULT_GROUP_SORT);
  const [sort, setSort] = useState<EntrySort>(DEFAULT_ENTRY_SORT);
  const [timelineMetricId, setTimelineMetricId] =
    useState<TimelineMetricId>("duration");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const searchTexts = useMemo(
    () => new Map(entries.map((entry) => [entry.id, entrySearchText(entry)])),
    [entries],
  );
  const entryFindings = useMemo(
    () => new Map(entries.map((entry) => [entry.id, analyzeEntry(entry)])),
    [entries],
  );
  const analyzerIds = useMemo(
    () =>
      new Map(
        [...entryFindings].map(([id, findings]) => [
          id,
          new Set(findings.map((f) => f.analyzerId)),
        ]),
      ),
    [entryFindings],
  );
  const context = useMemo(
    () => ({
      searchTextOf: (entry: SlowQueryEntry) => searchTexts.get(entry.id) ?? "",
      analyzerIdsOf: (entry: SlowQueryEntry) =>
        analyzerIds.get(entry.id) ?? EMPTY_IDS,
    }),
    [searchTexts, analyzerIds],
  );
  const dimensions = useMemo(() => recordedDimensions(entries), [entries]);
  const workload = useMemo(() => {
    const summary = summarizeWorkload(entries);
    return { summary, findings: analyzeWorkload({ entries, summary }) };
  }, [entries]);
  const hasComments = useMemo(
    () => entries.some((entry) => entry.comment !== undefined),
    [entries],
  );

  const filtered = useMemo(
    () => sortEntries(filterEntries(entries, filter, context), sort),
    [entries, filter, context, sort],
  );
  const captureSpan = useMemo(() => timeSpanOf(entries), [entries]);
  const timelineMetrics = useMemo(
    () => recordedTimelineMetrics(entries),
    [entries],
  );
  const timelineMetric = timelineMetricById(timelineMetricId);
  const { timeWindow } = filter;
  const timeline = useMemo(
    () =>
      bucketTimeline(
        filtered,
        timelineMetric,
        undefined,
        captureSpan && {
          start: timeWindow.start?.getTime() ?? captureSpan.start,
          end: timeWindow.end?.getTime() ?? captureSpan.end,
        },
      ),
    [filtered, timelineMetric, captureSpan, timeWindow],
  );

  const facets = useMemo<Facet[]>(
    () =>
      dimensions.map((dimension) => ({
        dimension,
        values: facetValues(
          filterEntries(entries, filter, context, {
            exceptFacet: dimension.id,
          }),
          dimension,
        ),
      })),
    [entries, filter, context, dimensions],
  );
  const findingOptions = useMemo<FindingOption[]>(() => {
    const others = filterEntries(
      entries,
      { ...filter, findingAnalyzerIds: EMPTY_IDS },
      context,
    );
    return ENTRY_ANALYZERS.map((analyzer) => ({
      key: analyzer.id,
      label: analyzer.label,
      count: others.filter((e) => context.analyzerIdsOf(e).has(analyzer.id))
        .length,
    })).filter((option) => option.count > 0);
  }, [entries, filter, context]);

  const dimension = groupDimensionById(dimensionId);
  const groupSource = useMemo(
    () =>
      filter.facets.has(dimension.id)
        ? filterEntries(entries, filter, context, { exceptFacet: dimension.id })
        : filtered,
    [entries, filter, context, dimension, filtered],
  );
  const groups = useMemo(
    () => sortGroups(groupEntries(groupSource, dimension), groupSort),
    [groupSource, dimension, groupSort],
  );
  const groupFindings = useMemo(
    () => new Map(groups.map((group) => [group.key, analyzeGroup(group)])),
    [groups],
  );

  const selectedIndex =
    selectedId === null ? -1 : filtered.findIndex((e) => e.id === selectedId);
  const selected = selectedIndex >= 0 ? filtered[selectedIndex] : undefined;

  const updateFilter = useCallback(
    (update: (current: EntryFilter) => EntryFilter) => {
      setFilter(update);
      setSelectedId(null);
    },
    [],
  );
  const patchFilter = useCallback(
    (patch: Partial<EntryFilter>) =>
      updateFilter((current) => ({ ...current, ...patch })),
    [updateFilter],
  );

  const toggleFacet = useCallback(
    (facetId: GroupDimensionId, key: string, label: string) =>
      updateFilter((current) => toggleFacetValue(current, facetId, key, label)),
    [updateFilter],
  );

  const toggleGroup = useCallback(
    (group: QueryGroup) =>
      toggleFacet(
        dimensionId,
        group.key,
        groupLabelOf(dimension, group.entries[0]!),
      ),
    [dimension, dimensionId, toggleFacet],
  );

  const selectOffset = useCallback(
    (offset: number) => {
      if (filtered.length === 0) return;
      const start =
        selectedIndex < 0 ? (offset > 0 ? -1 : filtered.length) : selectedIndex;
      const next = Math.min(filtered.length - 1, Math.max(0, start + offset));
      setSelectedId(filtered[next]!.id);
    },
    [filtered, selectedIndex],
  );

  const toggleFinding = useCallback(
    (analyzerId: string) =>
      updateFilter((current) => {
        const findingAnalyzerIds = new Set(current.findingAnalyzerIds);
        if (findingAnalyzerIds.has(analyzerId))
          findingAnalyzerIds.delete(analyzerId);
        else findingAnalyzerIds.add(analyzerId);
        return { ...current, findingAnalyzerIds };
      }),
    [updateFilter],
  );
  const clearFilters = useCallback(
    () => updateFilter(() => EMPTY_FILTER),
    [updateFilter],
  );
  const select = useCallback((id: number) => setSelectedId(id), []);
  const selectNext = useCallback(() => selectOffset(1), [selectOffset]);
  const selectPrevious = useCallback(() => selectOffset(-1), [selectOffset]);
  const closeDetail = useCallback(() => setSelectedId(null), []);

  const entryFindingsOf = useCallback(
    (id: number) => entryFindings.get(id) ?? [],
    [entryFindings],
  );
  const groupFindingsOf = useCallback(
    (key: string) => groupFindings.get(key) ?? [],
    [groupFindings],
  );

  return {
    filter,
    hasFilters: hasActiveFilter(filter),
    patchFilter,
    toggleFacet,
    toggleFinding,
    clearFilters,
    facets,
    findingOptions,
    dimensions,
    dimension,
    selectDimension: setDimensionId,
    groups,
    groupSort,
    setGroupSort,
    groupFindingsOf,
    toggleGroup,
    filtered,
    sort,
    setSort,
    entryFindingsOf,
    hasComments,
    workload,
    captureStart: captureSpan && new Date(captureSpan.start),
    captureEnd: captureSpan && new Date(captureSpan.end),
    timeline,
    timelineMetrics,
    selectTimelineMetric: setTimelineMetricId,
    selected,
    select,
    selectNext,
    selectPrevious,
    closeDetail,
  };
}
