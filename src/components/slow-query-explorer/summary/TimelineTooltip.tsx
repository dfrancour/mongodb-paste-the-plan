import type { TimelineBucket, TimelineMetric } from "#lib/slow-query";
import type { SlowQueryEntry } from "#types/slow-query";
import {
  formatCount,
  formatDurationMs,
  formatUtcTimestamp,
} from "#lib/utils/formatters";
import type { Segment } from "./timelineLayout";

interface TimelineTooltipProps {
  readonly bucket: TimelineBucket;
  readonly metric: TimelineMetric;
  readonly bucketMs: number;
  readonly segment: Segment;
  /** Pointer position within the chart wrapper. */
  readonly x: number;
  readonly y: number;
  /** Wrapper width, to keep the tooltip on-screen near the right edge. */
  readonly width: number;
}

const TOOLTIP_WIDTH = 384;
const OFFSET = 16;

/** What one segment of the timeline is: an entry, or the rest of a bucket. */
export function TimelineTooltip({
  bucket,
  metric,
  bucketMs,
  segment,
  x,
  y,
  width,
}: TimelineTooltipProps) {
  const flip = x + OFFSET + TOOLTIP_WIDTH > width;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 w-96 -translate-y-1/2 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
      style={{ left: flip ? x - OFFSET - TOOLTIP_WIDTH : x + OFFSET, top: y }}
    >
      {segment.kind === "entry" ? (
        <EntryDetails entry={segment.entry} metric={metric} />
      ) : (
        <RestDetails
          bucket={bucket}
          bucketMs={bucketMs}
          count={segment.count}
          total={segment.total}
        />
      )}
    </div>
  );
}

function EntryDetails({
  entry,
  metric,
}: {
  readonly entry: SlowQueryEntry;
  readonly metric: TimelineMetric;
}) {
  const { docsExamined, nreturned } = entry.metrics;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xl font-semibold text-neutral-900 tabular-nums dark:text-neutral-100">
          {formatDurationMs(metric.valueOf(entry))}
          {metric.id !== "duration" && (
            <span className="ml-2 text-xs font-normal text-neutral-500 dark:text-neutral-400">
              {metric.label} of {formatDurationMs(entry.metrics.durationMillis)}
            </span>
          )}
        </span>
        <span className="text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
          {formatUtcTimestamp(entry.timestamp)} UTC
        </span>
      </div>
      <div className="text-sm break-all text-neutral-900 dark:text-neutral-100">
        <span className="font-medium">
          {entry.operation === "command" ? entry.commandName : entry.operation}
        </span>{" "}
        <span className="text-neutral-600 dark:text-neutral-300">
          on {entry.namespace}
        </span>
      </div>
      <div className="line-clamp-2 font-mono text-xs break-all text-neutral-700 dark:text-neutral-300">
        {entry.shape.summary}
      </div>
      {entry.planSummary && (
        <div className="line-clamp-2 font-mono text-xs break-all text-neutral-500 dark:text-neutral-400">
          {entry.planSummary}
        </div>
      )}
      {(docsExamined !== undefined || nreturned !== undefined) && (
        <div className="text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
          {docsExamined !== undefined && (
            <>
              examined{" "}
              <span className="text-neutral-700 dark:text-neutral-200">
                {formatCount(docsExamined)}
              </span>
            </>
          )}
          {docsExamined !== undefined && nreturned !== undefined && " · "}
          {nreturned !== undefined && (
            <>
              returned{" "}
              <span className="text-neutral-700 dark:text-neutral-200">
                {formatCount(nreturned)}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RestDetails({
  bucket,
  bucketMs,
  count,
  total,
}: {
  readonly bucket: TimelineBucket;
  readonly bucketMs: number;
  readonly count: number;
  readonly total: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xl font-semibold text-neutral-900 tabular-nums dark:text-neutral-100">
          {formatDurationMs(total)}
        </span>
        <span className="text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
          {formatUtcTimestamp(bucket.start)} +{formatDurationMs(bucketMs)}
        </span>
      </div>
      <div className="text-sm text-neutral-900 dark:text-neutral-100">
        <span className="font-medium">{formatCount(count)} more entries</span>
        <span className="text-neutral-600 dark:text-neutral-300">
          {" "}
          of {formatCount(bucket.count)} in this bucket
        </span>
      </div>
      <div className="text-xs text-neutral-500 dark:text-neutral-400">
        Click to zoom to this bucket
      </div>
    </div>
  );
}
