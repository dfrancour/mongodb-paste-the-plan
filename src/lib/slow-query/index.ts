/**
 * Public API for slow-query log analysis.
 *
 * Primary entry point: `loadSlowQueryLog(text)` — text in, entries out.
 * Grouping and summary helpers operate on the resulting entries.
 */

export { loadSlowQueryLog } from "./parse/loadSlowQueryLog";
export { parsePlanSummary, collapsePlanSummary } from "./parse/planSummary";
export { SlowQueryParseError } from "./errors";

export { buildQueryShape } from "./shape/queryShape";
export { describeCommand } from "./shape/shapeLabel";
export { buildShellCommand } from "./shellCommand";
export { glossaryHrefForStage } from "./planSummaryLinks";
export {
  analyzeEntry,
  analyzeGroup,
  analyzeWorkload,
  ENTRY_ANALYZERS,
} from "./analyzers";

export {
  GROUP_DIMENSIONS,
  groupDimensionById,
  groupLabelOf,
  recordedDimensions,
  type GroupDimension,
  type GroupDimensionId,
} from "./group/dimensions";
export {
  groupEntries,
  type QueryGroup,
  type GroupStats,
} from "./group/groupEntries";
export {
  summarizeWorkload,
  type WorkloadSummary,
} from "./group/workloadSummary";
export {
  efficiency,
  documentEfficiencyOf,
  indexEfficiencyOf,
} from "./group/metrics";
export { documentEfficiencySeverity } from "./analyzers/entry/low_document_efficiency";
export {
  bucketTimeline,
  timeSpanOf,
  type Timeline,
  type TimelineBucket,
  type TimeSpan,
} from "./group/timeline";
export {
  DEFAULT_TIMELINE_METRIC,
  recordedTimelineMetrics,
  timelineMetricById,
  type TimelineMetric,
  type TimelineMetricId,
} from "./group/timelineMetric";

export {
  EMPTY_FILTER,
  filterEntries,
  facetValues,
  hasActiveFilter,
  toggleFacetValue,
  type EntryFilter,
  type FacetSelection,
  type FacetValue,
  type FilterContext,
  type FilterOptions,
  type TimeWindow,
} from "./view/filterEntries";
export { parseDurationMs } from "./view/durationInput";
export {
  sortEntries,
  DEFAULT_ENTRY_SORT,
  type EntrySort,
  type EntrySortKey,
  type SortDirection,
} from "./view/sortEntries";
export { entrySearchText } from "./view/searchText";
export {
  sortGroups,
  DEFAULT_GROUP_SORT,
  type GroupSort,
  type GroupSortKey,
} from "./view/sortGroups";
