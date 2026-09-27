"use client";

import type { EntryFilter, GroupDimensionId } from "#lib/slow-query";
import { groupDimensionById } from "#lib/slow-query";
import type { Facet, FindingOption } from "#hooks/useSlowQueryViewState";
import { SearchInput } from "#components/shared/SearchInput";
import { ClearFiltersButton } from "#components/shared/ClearFiltersButton";
import {
  formatCount,
  formatDurationMs,
  formatUtcTimestamp,
} from "#lib/utils/formatters";
import { formatEfficiency } from "#lib/utils/planEfficiencyUtils";
import { FacetPicker } from "./FacetPicker";
import { RemovableChip } from "./RemovableChip";
import { ThresholdsPicker } from "./ThresholdsPicker";
import { TimeWindowPicker } from "./TimeWindowPicker";

interface ScopeControlsProps {
  readonly filter: EntryFilter;
  readonly hasFilters: boolean;
  readonly filteredCount: number;
  readonly total: number;
  readonly facets: readonly Facet[];
  readonly findingOptions: readonly FindingOption[];
  readonly captureStart: Date | undefined;
  readonly captureEnd: Date | undefined;
  readonly onToggleFacet: (
    dimensionId: GroupDimensionId,
    key: string,
    label: string,
  ) => void;
  readonly onToggleFinding: (analyzerId: string) => void;
  readonly onPatch: (patch: Partial<EntryFilter>) => void;
  readonly onClearFilters: () => void;
}

/**
 * Every filter in one place: search and the entry count, a row of filter
 * triggers, then each active value as a chip. Everything below is scoped to it.
 */
export function ScopeControls({
  filter,
  hasFilters,
  filteredCount,
  total,
  facets,
  findingOptions,
  captureStart,
  captureEnd,
  onToggleFacet,
  onToggleFinding,
  onPatch,
  onClearFilters,
}: ScopeControlsProps) {
  const chips = activeChips(filter, findingOptions, {
    onToggleFacet,
    onToggleFinding,
    onPatch,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <SearchInput
          value={filter.search}
          onChange={(search) => onPatch({ search })}
          placeholder="Search entries…"
          className="max-w-xl flex-1"
        />
        <span className="ml-auto text-sm whitespace-nowrap text-neutral-600 tabular-nums dark:text-neutral-400">
          {hasFilters ? (
            <>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {formatCount(filteredCount)}
              </span>{" "}
              of {formatCount(total)} entries
            </>
          ) : (
            `${formatCount(total)} entries`
          )}
        </span>
        {hasFilters && <ClearFiltersButton onClick={onClearFilters} />}
      </div>
      <div className="flex flex-wrap items-center gap-x-0.5 gap-y-1">
        {facets.map((facet) => (
          <FacetPicker
            key={facet.dimension.id}
            label={facet.dimension.label}
            options={facet.values}
            selectedKeys={
              new Set(filter.facets.get(facet.dimension.id)?.keys() ?? [])
            }
            onToggle={(option) =>
              onToggleFacet(facet.dimension.id, option.key, option.label)
            }
          />
        ))}
        <Divider />
        <ThresholdsPicker values={filter} onChange={onPatch} />
        <TimeWindowPicker
          value={filter.timeWindow}
          captureStart={captureStart}
          captureEnd={captureEnd}
          onChange={(timeWindow) => onPatch({ timeWindow })}
        />
        {findingOptions.length > 0 && (
          <FacetPicker
            label="Findings"
            options={findingOptions}
            selectedKeys={filter.findingAnalyzerIds}
            onToggle={(option) => onToggleFinding(option.key)}
          />
        )}
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <RemovableChip key={chip.id} {...chip} />
          ))}
        </div>
      )}
    </div>
  );
}

function Divider() {
  return (
    <span
      aria-hidden="true"
      className="mx-1.5 h-4 w-px bg-neutral-200 dark:bg-neutral-700"
    />
  );
}

interface Chip {
  readonly id: string;
  readonly category: string;
  readonly label: string;
  readonly onRemove: () => void;
}

function activeChips(
  filter: EntryFilter,
  findingOptions: readonly FindingOption[],
  actions: Pick<
    ScopeControlsProps,
    "onToggleFacet" | "onToggleFinding" | "onPatch"
  >,
): Chip[] {
  const chips: Chip[] = [];
  for (const [dimensionId, values] of filter.facets) {
    for (const [key, label] of values) {
      chips.push({
        id: `${dimensionId}:${key}`,
        category: groupDimensionById(dimensionId).label,
        label,
        onRemove: () => actions.onToggleFacet(dimensionId, key, label),
      });
    }
  }
  for (const analyzerId of filter.findingAnalyzerIds) {
    chips.push({
      id: `finding:${analyzerId}`,
      category: "Finding",
      label:
        findingOptions.find((o) => o.key === analyzerId)?.label ?? analyzerId,
      onRemove: () => actions.onToggleFinding(analyzerId),
    });
  }
  const threshold = (
    key:
      | "minDurationMs"
      | "maxDurationMs"
      | "minDocsExamined"
      | "maxDocumentEfficiency",
    category: string,
    format: (value: number) => string,
  ) => {
    const value = filter[key];
    if (value !== null) {
      chips.push({
        id: key,
        category,
        label: format(value),
        onRemove: () => actions.onPatch({ [key]: null }),
      });
    }
  };
  threshold("minDurationMs", "durationMillis ≥", formatDurationMs);
  threshold("maxDurationMs", "durationMillis ≤", formatDurationMs);
  threshold("minDocsExamined", "docsExamined ≥", formatCount);
  threshold("maxDocumentEfficiency", "Document Efficiency ≤", formatEfficiency);
  if (filter.timeWindow.start) {
    chips.push({
      id: "from",
      category: "From",
      label: `${formatUtcTimestamp(filter.timeWindow.start)} UTC`,
      onRemove: () =>
        actions.onPatch({ timeWindow: { ...filter.timeWindow, start: null } }),
    });
  }
  if (filter.timeWindow.end) {
    chips.push({
      id: "until",
      category: "Until",
      label: `${formatUtcTimestamp(filter.timeWindow.end)} UTC`,
      onRemove: () =>
        actions.onPatch({ timeWindow: { ...filter.timeWindow, end: null } }),
    });
  }
  return chips;
}
