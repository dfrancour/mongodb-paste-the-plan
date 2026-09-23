"use client";

import { useRef, useState, type ReactNode } from "react";
import { DropdownButton } from "./DropdownButton";
import { useVirtualRows } from "./useVirtualRows";

export interface DataColumn<Row, SortKey extends string> {
  readonly id: string;
  readonly label: string;
  readonly numeric?: boolean;
  /** Present when the column can be sorted. */
  readonly sortKey?: SortKey;
  /** Wrap long content within a bounded width instead of widening the column. */
  readonly wrap?: boolean;
  /** Width floor for a wrapping column, so auto layout does not starve it. */
  readonly minWidthClass?: string;
  readonly className?: string;
  /** Start hidden; the column picker can show it. */
  readonly defaultHidden?: boolean;
  readonly render: (row: Row) => ReactNode;
}

interface SortState<SortKey extends string> {
  readonly key: SortKey;
  readonly direction: "asc" | "desc";
}

interface DataTableProps<Row, SortKey extends string> {
  readonly ariaLabel: string;
  readonly columns: readonly DataColumn<Row, SortKey>[];
  /** Already sorted by `sort`; the table only reports header clicks. */
  readonly rows: readonly Row[];
  readonly rowKey: (row: Row) => string | number;
  readonly sort?: SortState<SortKey>;
  readonly onSortChange?: (sort: SortState<SortKey>) => void;
  readonly selectedKeys?: ReadonlySet<string | number>;
  readonly onSelect?: (row: Row) => void;
  /** Pointer entered a row, or left the one it was on (null). */
  readonly onHover?: (row: Row | null) => void;
  /** Rendered left of the column picker, above the table. */
  readonly toolbar?: ReactNode;
  /** Whether viewers can hide and show columns; on unless the set is small. */
  readonly columnPicker?: boolean;
  readonly maxHeightClass?: string;
}

const cellClass =
  "border-b border-neutral-200 px-3 py-1.5 align-top dark:border-neutral-700";
const numericClass = "text-right tabular-nums";
const wrapClass = "max-w-2xl whitespace-normal [overflow-wrap:anywhere]";

/**
 * Sortable, selectable table with a sticky header and a column picker.
 * Rows are virtualized, so a log of any size renders the rows in view.
 * Sorting and selection belong to the caller; column visibility is the
 * table's own.
 */
export function DataTable<Row, SortKey extends string>({
  ariaLabel,
  columns,
  rows,
  rowKey,
  sort,
  onSortChange,
  selectedKeys,
  onSelect,
  onHover,
  toolbar,
  columnPicker = true,
  maxHeightClass = "max-h-[560px]",
}: DataTableProps<Row, SortKey>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(
    () => new Set(columns.filter((c) => c.defaultHidden).map((c) => c.id)),
  );
  const visibleColumns = columns.filter((c) => !hiddenIds.has(c.id));
  const { items, measureRow, paddingTop, paddingBottom } = useVirtualRows(
    rows.length,
    scrollRef,
  );

  const toggleColumn = (id: string) =>
    setHiddenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSort = (column: DataColumn<Row, SortKey>) => {
    if (column.sortKey === undefined || !onSortChange) return;
    const direction =
      sort?.key === column.sortKey
        ? sort.direction === "asc"
          ? "desc"
          : "asc"
        : column.numeric
          ? "desc"
          : "asc";
    onSortChange({ key: column.sortKey, direction });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">{toolbar}</div>
        {columnPicker && (
          <DropdownButton label="Columns" widthClass="w-56">
            <ul className="space-y-0.5">
              {columns.map((column) => (
                <li key={column.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-neutral-800 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-700">
                    <input
                      type="checkbox"
                      checked={!hiddenIds.has(column.id)}
                      onChange={() => toggleColumn(column.id)}
                      className="accent-primary h-4 w-4 flex-shrink-0"
                    />
                    {column.label}
                  </label>
                </li>
              ))}
            </ul>
          </DropdownButton>
        )}
      </div>
      <div
        ref={scrollRef}
        className={`scrollbar-subtle relative ${maxHeightClass} overflow-auto rounded-md border border-neutral-200 dark:border-neutral-700`}
      >
        <table
          aria-label={ariaLabel}
          className="w-full border-collapse text-sm"
        >
          <thead className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-800">
            <tr>
              {visibleColumns.map((column) => {
                const sorted =
                  column.sortKey !== undefined && sort?.key === column.sortKey
                    ? sort.direction
                    : undefined;
                const sortable =
                  column.sortKey !== undefined && onSortChange !== undefined;
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={
                      sorted === "asc"
                        ? "ascending"
                        : sorted === "desc"
                          ? "descending"
                          : undefined
                    }
                    className={`${cellClass} text-left text-xs font-medium whitespace-nowrap text-neutral-600 select-none dark:text-neutral-400 ${
                      column.numeric ? numericClass : ""
                    }`}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column)}
                        className="cursor-pointer hover:text-neutral-900 dark:hover:text-neutral-100"
                      >
                        {column.label}
                        {sorted && (
                          <span className="text-primary ml-1">
                            {sorted === "asc" ? "▲" : "▼"}
                          </span>
                        )}
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr aria-hidden="true">
                <td
                  colSpan={visibleColumns.length}
                  style={{ height: paddingTop, padding: 0, border: 0 }}
                />
              </tr>
            )}
            {items.map((item) => {
              const row = rows[item.index]!;
              const key = rowKey(row);
              const selected = selectedKeys?.has(key) ?? false;
              return (
                <tr
                  key={key}
                  ref={measureRow}
                  data-index={item.index}
                  onClick={onSelect ? () => onSelect(row) : undefined}
                  tabIndex={onSelect ? 0 : undefined}
                  onKeyDown={
                    onSelect
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onSelect(row);
                          }
                        }
                      : undefined
                  }
                  onMouseEnter={onHover ? () => onHover(row) : undefined}
                  onMouseLeave={onHover ? () => onHover(null) : undefined}
                  aria-selected={onSelect ? selected : undefined}
                  className={
                    onSelect
                      ? `cursor-pointer ${
                          selected
                            ? "bg-primary-light dark:bg-primary-dark"
                            : "hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                        }`
                      : ""
                  }
                >
                  {visibleColumns.map((column) => (
                    <td
                      key={column.id}
                      className={`${cellClass} ${column.wrap ? "" : "whitespace-nowrap"} ${column.numeric ? numericClass : ""} ${column.className ?? ""}`}
                    >
                      {column.wrap ? (
                        <div
                          className={`${wrapClass} ${column.minWidthClass ?? "min-w-64"}`}
                        >
                          {column.render(row)}
                        </div>
                      ) : (
                        column.render(row)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr aria-hidden="true">
                <td
                  colSpan={visibleColumns.length}
                  style={{ height: paddingBottom, padding: 0, border: 0 }}
                />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
