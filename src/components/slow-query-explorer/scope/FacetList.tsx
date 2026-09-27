"use client";

import { useState } from "react";
import { SearchInput } from "#components/shared/SearchInput";
import { formatCount } from "#lib/utils/formatters";

export interface FacetOption {
  readonly key: string;
  readonly label: string;
  readonly count: number;
}

interface FacetListProps {
  readonly label: string;
  readonly options: readonly FacetOption[];
  readonly selectedKeys: ReadonlySet<string>;
  readonly onToggle: (option: FacetOption) => void;
}

const VISIBLE_LIMIT = 40;

/** Searchable checklist with counts, for a popover body. */
export function FacetList({
  label,
  options,
  selectedKeys,
  onToggle,
}: FacetListProps) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matching = needle
    ? options.filter((o) => o.label.toLowerCase().includes(needle))
    : options;
  const visible = matching.slice(0, VISIBLE_LIMIT);
  const hidden = matching.length - visible.length;

  return (
    <>
      {options.length > 8 && (
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={`Find a ${label.toLowerCase()}…`}
          className="mb-2"
        />
      )}
      <ul className="scrollbar-subtle max-h-80 space-y-0.5 overflow-auto">
        {visible.map((option) => (
          <li key={option.key}>
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-neutral-800 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-700">
              <input
                type="checkbox"
                checked={selectedKeys.has(option.key)}
                onChange={() => onToggle(option)}
                className="accent-primary h-4 w-4 flex-shrink-0"
              />
              <span
                className="min-w-0 flex-1 truncate font-mono text-xs"
                title={option.label}
              >
                {option.label}
              </span>
              <span className="text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
                {formatCount(option.count)}
              </span>
            </label>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="px-2 py-1 text-sm text-neutral-500 dark:text-neutral-400">
            No matches
          </li>
        )}
      </ul>
      {hidden > 0 && (
        <p className="mt-2 px-2 text-xs text-neutral-500 dark:text-neutral-400">
          {formatCount(hidden)} more; type to narrow the list.
        </p>
      )}
    </>
  );
}
