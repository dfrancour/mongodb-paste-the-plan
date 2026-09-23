"use client";

import { useMemo, type ReactNode } from "react";
import {
  type QueryGroup,
  type GroupSort,
  type GroupSortKey,
  type GroupDimension,
} from "#lib/slow-query";
import type { SlowQueryFinding } from "#types/slow-query-analysis";
import { DataTable, type DataColumn } from "#components/common/DataTable";
import { formatCount, formatDurationMs } from "#lib/utils/formatters";
import { FindingSummary } from "../findings/FindingSummary";
import { MagnitudeBar } from "../metrics/MagnitudeBar";

interface GroupTableProps {
  readonly groups: readonly QueryGroup[];
  readonly findingsOf: (key: string) => readonly SlowQueryFinding[];
  readonly dimension: GroupDimension;
  readonly sort: GroupSort;
  readonly selectedKeys: ReadonlySet<string>;
  readonly onSortChange: (sort: GroupSort) => void;
  readonly onSelect: (group: QueryGroup) => void;
  readonly onHover: (group: QueryGroup | null) => void;
  readonly toolbar?: ReactNode;
}

export function GroupTable({
  groups,
  findingsOf,
  dimension,
  sort,
  selectedKeys,
  onSortChange,
  onSelect,
  onHover,
  toolbar,
}: GroupTableProps) {
  const maxDuration = useMemo(
    () => Math.max(0, ...groups.map((g) => g.stats.durationTotal ?? 0)),
    [groups],
  );
  const columns = useMemo(
    () => groupColumns(dimension, findingsOf, maxDuration, selectedKeys),
    [dimension, findingsOf, maxDuration, selectedKeys],
  );

  return (
    <DataTable
      ariaLabel="Query groups"
      columns={columns}
      rows={groups}
      rowKey={(g) => g.key}
      sort={sort}
      onSortChange={onSortChange}
      selectedKeys={selectedKeys}
      onSelect={onSelect}
      onHover={onHover}
      toolbar={toolbar}
      columnPicker={false}
      maxHeightClass="max-h-[420px]"
    />
  );
}

function groupColumns(
  dimension: GroupDimension,
  findingsOf: (key: string) => readonly SlowQueryFinding[],
  maxDuration: number,
  selectedKeys: ReadonlySet<string>,
): DataColumn<QueryGroup, GroupSortKey>[] {
  return [
    {
      id: "selected",
      label: "",
      className: "w-8 pr-0",
      render: (g) => (
        <input
          type="checkbox"
          checked={selectedKeys.has(g.key)}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          className="accent-primary pointer-events-none h-4 w-4"
        />
      ),
    },
    {
      id: "label",
      label: dimension.label,
      sortKey: "label",
      wrap: true,
      minWidthClass: "min-w-[28rem]",
      className: "font-mono text-xs",
      render: (g) => <GroupLabel group={g} detailOf={dimension.detailOf} />,
    },
    {
      id: "findings",
      label: "Findings",
      render: (g) => <FindingSummary findings={findingsOf(g.key)} />,
    },
    {
      id: "count",
      label: "Count",
      numeric: true,
      sortKey: "count",
      render: (g) => formatCount(g.stats.count),
    },
    {
      id: "durationTotal",
      label: "Cumulative time",
      sortKey: "durationTotal",
      render: (g) => (
        <MagnitudeBar
          value={g.stats.durationTotal}
          max={maxDuration}
          format={formatDurationMs}
          share={g.stats.timeShare}
        />
      ),
    },
    {
      id: "durationAvg",
      label: "Avg",
      numeric: true,
      sortKey: "durationAvg",
      render: (g) => formatDurationMs(g.stats.durationAvg),
    },
    {
      id: "durationMax",
      label: "Max",
      numeric: true,
      sortKey: "durationMax",
      render: (g) => formatDurationMs(g.stats.durationMax),
    },
  ];
}

/** Namespaced dimensions show the namespace over the detail; others show their key. */
function GroupLabel({
  group,
  detailOf,
}: {
  readonly group: QueryGroup;
  readonly detailOf: GroupDimension["detailOf"];
}) {
  if (!detailOf) return <>{group.label}</>;
  const first = group.entries[0]!;
  return (
    <>
      <div className="text-neutral-500 dark:text-neutral-400">
        {first.namespace}
      </div>
      <div>{detailOf(first)}</div>
    </>
  );
}
