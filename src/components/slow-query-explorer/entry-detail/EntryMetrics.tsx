import type { ReactNode } from "react";
import type { SlowQueryEntry } from "#types/slow-query";
import {
  formatBytes,
  formatCount,
  formatDurationMs,
} from "#lib/utils/formatters";

type Row = readonly [label: string, value: string | undefined];

/**
 * Every recorded field beyond the key five, grouped by the question it
 * answers, under its log field name. Unrecorded fields are omitted.
 */
export function EntryMetrics({ entry }: { readonly entry: SlowQueryEntry }) {
  const { metrics: m, planCache, flags } = entry;
  const flagTokens = [
    flags.hasSortStage && "hasSortStage",
    flags.usedDisk && "usedDisk",
    flags.cursorExhausted && "cursorExhausted",
    flags.fromMongos && "fromMongos",
    flags.needsMerge && "needsMerge",
  ].filter((token): token is string => typeof token === "string");

  return (
    <div className="space-y-5">
      <Section title="Time">
        <Rows
          rows={[
            ["durationMillis", formatDurationMs(m.durationMillis)],
            ["workingMillis", optional(m.workingMillis, formatDurationMs)],
            [
              "cpuNanos",
              optional(m.cpuNanos, (v) => formatDurationMs(v / 1e6)),
            ],
            [
              "planningTimeMicros",
              optional(m.planningTimeMicros, (v) => formatDurationMs(v / 1000)),
            ],
            [
              "storage.data.timeReadingMicros",
              optional(m.timeReadingMicros, (v) => formatDurationMs(v / 1000)),
            ],
            [
              "queues.execution.totalTimeQueuedMicros",
              optional(m.totalTimeQueuedMicros, (v) =>
                formatDurationMs(v / 1000),
              ),
            ],
          ]}
        />
      </Section>
      <Section title="Work done">
        <Rows
          rows={[
            ["storage.data.bytesRead", optional(m.bytesRead, formatBytes)],
            ["reslen", optional(m.reslen, formatBytes)],
            ["numYields", optional(m.numYields, formatCount)],
            ["nBatches", optional(m.nBatches, formatCount)],
            [
              "nMatched / nModified / nUpserted",
              writeCounts([m.nMatched, m.nModified, m.nUpserted]),
            ],
            ["ndeleted", optional(m.ndeleted, formatCount)],
            ["ninserted", optional(m.ninserted, formatCount)],
            ["writeConflicts", optional(m.writeConflicts, formatCount)],
          ]}
        />
      </Section>
      <Section title="Plan">
        <Rows
          rows={[
            ["fromPlanCache", optional(planCache.fromPlanCache, String)],
            ["fromMultiPlanner", flag(planCache.fromMultiPlanner)],
            ["replanned", flag(planCache.replanned)],
            ["replanReason", planCache.replanReason],
            ["queryFramework", planCache.queryFramework],
          ]}
        />
        {flagTokens.length > 0 && (
          <p className="mt-2 font-mono text-xs text-neutral-700 dark:text-neutral-300">
            {flagTokens.join(" · ")}
          </p>
        )}
      </Section>
      <Section title="Identity">
        <Rows
          muted
          rows={[
            ["t", entry.timestamp?.toISOString()],
            ["comment", entry.comment],
            ["appName", entry.appName],
            ["remote", entry.remote],
            ["queryShapeHash", planCache.queryShapeHash],
            ["queryHash", planCache.queryHash ?? planCache.planCacheShapeHash],
            ["planCacheKey", planCache.planCacheKey],
          ]}
        />
      </Section>
    </div>
  );
}

const GRID =
  "grid grid-cols-[minmax(150px,auto)_1fr] items-center gap-x-4 gap-y-1 text-sm";

function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
        {title}
      </h4>
      {children}
    </section>
  );
}

function Rows({
  rows,
  muted = false,
}: {
  readonly rows: readonly Row[];
  readonly muted?: boolean;
}) {
  const recorded = rows.filter(
    (row): row is readonly [string, string] =>
      row[1] !== undefined && row[1] !== "",
  );
  if (recorded.length === 0) {
    return <p className="text-xs text-neutral-400">nothing recorded</p>;
  }
  return (
    <dl className={GRID}>
      {recorded.map(([label, value]) => (
        <div key={label} className="contents">
          <Label>{label}</Label>
          <dd
            className={`font-mono text-xs break-all ${
              muted
                ? "text-neutral-600 dark:text-neutral-400"
                : "text-neutral-900 dark:text-neutral-100"
            }`}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Label({ children }: { readonly children: ReactNode }) {
  return (
    <dt className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
      {children}
    </dt>
  );
}

function optional<T>(
  value: T | undefined,
  format: (value: T) => string,
): string | undefined {
  return value === undefined ? undefined : format(value);
}

/** Boolean flags are only worth a row when set. */
function flag(value: boolean | undefined): string | undefined {
  return value ? "true" : undefined;
}

function writeCounts(values: (number | undefined)[]): string | undefined {
  return values.every((v) => v === undefined)
    ? undefined
    : values.map(formatCount).join(" / ");
}
