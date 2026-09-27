"use client";

import { useMemo, type ReactNode } from "react";
import type { SlowQueryEntry } from "#types/slow-query";
import {
  collapsePlanSummary,
  describeCommand,
  documentEfficiencyOf,
  documentEfficiencySeverity,
  indexEfficiencyOf,
  type EntrySort,
  type EntrySortKey,
} from "#lib/slow-query";
import type { SlowQueryFinding } from "#types/slow-query-analysis";
import { DataTable, type DataColumn } from "#components/common/DataTable";
import {
  formatCount,
  formatDurationMs,
  formatUtcTimestamp,
} from "#lib/utils/formatters";
import { FindingSummary } from "../findings/FindingSummary";
import { EfficiencyValue } from "../metrics/EfficiencyValue";

interface EntryTableProps {
  readonly entries: readonly SlowQueryEntry[];
  /** Whether any entry in the log carries a comment; the column is omitted otherwise. */
  readonly hasComments: boolean;
  readonly findingsOf: (id: number) => readonly SlowQueryFinding[];
  readonly sort: EntrySort;
  readonly selectedId: number | undefined;
  readonly onSortChange: (sort: EntrySort) => void;
  readonly onSelect: (id: number) => void;
  readonly toolbar?: ReactNode;
}

const monoClass = "font-mono text-xs";

export function EntryTable({
  entries,
  hasComments,
  findingsOf,
  sort,
  selectedId,
  onSortChange,
  onSelect,
  toolbar,
}: EntryTableProps) {
  const columns = useMemo(
    () => entryColumns(findingsOf, hasComments),
    [findingsOf, hasComments],
  );
  const selectedKeys = useMemo(
    () => (selectedId === undefined ? undefined : new Set([selectedId])),
    [selectedId],
  );

  return (
    <DataTable
      ariaLabel="Log entries"
      columns={columns}
      rows={entries}
      rowKey={(e) => e.id}
      sort={sort}
      onSortChange={onSortChange}
      selectedKeys={selectedKeys}
      onSelect={(e) => onSelect(e.id)}
      toolbar={toolbar}
      maxHeightClass="max-h-[640px]"
    />
  );
}

function entryColumns(
  findingsOf: (id: number) => readonly SlowQueryFinding[],
  hasComments: boolean,
): DataColumn<SlowQueryEntry, EntrySortKey>[] {
  const columns: DataColumn<SlowQueryEntry, EntrySortKey>[] = [
    {
      id: "timestamp",
      label: "Time (UTC)",
      sortKey: "timestamp",
      className: monoClass,
      render: (e) => formatUtcTimestamp(e.timestamp),
    },
    {
      id: "duration",
      label: "Duration",
      numeric: true,
      sortKey: "durationMillis",
      render: (e) => formatDurationMs(e.metrics.durationMillis),
    },
    {
      id: "namespace",
      label: "Namespace",
      sortKey: "namespace",
      wrap: true,
      render: (e) => (
        <span className="flex items-baseline gap-2">
          <span className="shrink-0 font-mono text-xs whitespace-nowrap text-neutral-500 dark:text-neutral-400">
            {e.operation === "command" ? e.commandName : e.operation}
          </span>
          <span className="min-w-0">{e.namespace}</span>
        </span>
      ),
    },
    {
      id: "command",
      label: "Command",
      wrap: true,
      className: monoClass,
      render: (e) =>
        describeCommand(
          e.originatingCommand ?? e.command,
          e.logicalOperation,
          e.commandName,
        ),
    },
    {
      id: "planSummary",
      label: "Plan summary",
      wrap: true,
      minWidthClass: "min-w-48",
      className: monoClass,
      render: (e) =>
        e.planSummary ? (
          <span title={e.planSummary}>
            {collapsePlanSummary(e.planSummary)}
          </span>
        ) : (
          "—"
        ),
    },
    {
      id: "nreturned",
      label: "nreturned",
      numeric: true,
      sortKey: "nreturned",
      render: (e) => formatCount(e.metrics.nreturned),
    },
    {
      id: "docsExamined",
      label: "docsExamined",
      numeric: true,
      sortKey: "docsExamined",
      render: (e) => formatCount(e.metrics.docsExamined),
    },
    {
      id: "keysExamined",
      label: "keysExamined",
      numeric: true,
      sortKey: "keysExamined",
      defaultHidden: true,
      render: (e) => formatCount(e.metrics.keysExamined),
    },
    {
      id: "documentEfficiency",
      label: "Document Efficiency",
      numeric: true,
      sortKey: "documentEfficiency",
      render: (e) => {
        const value = documentEfficiencyOf(e.metrics);
        return (
          <EfficiencyValue
            value={value}
            severity={documentEfficiencySeverity(e.metrics.docsExamined, value)}
          />
        );
      },
    },
    {
      id: "indexEfficiency",
      label: "Index Efficiency",
      numeric: true,
      sortKey: "indexEfficiency",
      defaultHidden: true,
      render: (e) => <EfficiencyValue value={indexEfficiencyOf(e.metrics)} />,
    },
    {
      id: "findings",
      label: "Findings",
      render: (e) => <FindingSummary findings={findingsOf(e.id)} />,
    },
  ];
  if (hasComments) {
    columns.push({
      id: "comment",
      label: "Comment",
      className: monoClass,
      defaultHidden: true,
      render: (e) => e.comment ?? "",
    });
  }
  return columns;
}
