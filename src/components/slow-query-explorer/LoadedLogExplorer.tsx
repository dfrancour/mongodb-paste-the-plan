"use client";

import { useMemo, useState } from "react";
import { ScrollText } from "lucide-react";
import type { SlowQueryLoadResult } from "#types/slow-query";
import { useSlowQueryViewState } from "#hooks/useSlowQueryViewState";
import { ContributeLink } from "#components/common/ContributeLink";
import { BetaTag } from "./BetaTag";
import { SectionCard } from "#components/common/SectionCard";
import { Icon } from "#components/common/Icon";
import { WorkloadFindings } from "./findings/WorkloadFindings";
import { ScopeControls } from "./scope/ScopeControls";
import { TimelineSection } from "./summary/TimelineSection";
import { GroupsSection } from "./groups/GroupsSection";
import { EntriesSection } from "./entries/EntriesSection";
import { EntryDetailDrawer } from "./entry-detail/EntryDetailDrawer";

interface LoadedLogExplorerProps {
  readonly loaded: SlowQueryLoadResult;
  readonly onClear: () => void;
}

/**
 * Everything for one loaded log. Remount (new key) per load. The title card
 * holds the filters.
 */
export function LoadedLogExplorer({ loaded, onClear }: LoadedLogExplorerProps) {
  const entries = loaded.entries;
  const view = useSlowQueryViewState(entries);
  const selectedGroupKeys = useMemo<ReadonlySet<string>>(
    () => new Set(view.filter.facets.get(view.dimension.id)?.keys() ?? []),
    [view.filter.facets, view.dimension.id],
  );
  const [hoveredGroupKey, setHoveredGroupKey] = useState<string | null>(null);
  const highlightedIds = useMemo<ReadonlySet<number>>(() => {
    const group = view.groups.find((g) => g.key === hoveredGroupKey);
    return new Set(group?.entries.map((e) => e.id));
  }, [view.groups, hoveredGroupKey]);

  return (
    <>
      <SectionCard
        title="MongoDB Slow Query Explorer"
        titleBadge={<BetaTag />}
        icon={<Icon icon={ScrollText} variant="primary" />}
        headerAction={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClear}
              className="btn-secondary btn-small"
            >
              Reset
            </button>
            <ContributeLink />
          </div>
        }
        featured
      >
        <ScopeControls
          filter={view.filter}
          hasFilters={view.hasFilters}
          filteredCount={view.filtered.length}
          total={entries.length}
          facets={view.facets}
          findingOptions={view.findingOptions}
          captureStart={view.captureStart}
          captureEnd={view.captureEnd}
          onToggleFacet={view.toggleFacet}
          onToggleFinding={view.toggleFinding}
          onPatch={view.patchFilter}
          onClearFilters={view.clearFilters}
        />
        <WorkloadFindings findings={view.workload.findings} />
      </SectionCard>
      <TimelineSection
        timeline={view.timeline}
        metrics={view.timelineMetrics}
        onSelectMetric={view.selectTimelineMetric}
        selectedId={view.selected?.id}
        highlightedIds={highlightedIds}
        onBrush={(timeWindow) => view.patchFilter({ timeWindow })}
        onSelectEntry={view.select}
      />
      <GroupsSection
        dimensions={view.dimensions}
        dimension={view.dimension}
        onSelectDimension={view.selectDimension}
        groups={view.groups}
        findingsOf={view.groupFindingsOf}
        sort={view.groupSort}
        onSortChange={view.setGroupSort}
        selectedKeys={selectedGroupKeys}
        onSelect={view.toggleGroup}
        onHover={(group) => setHoveredGroupKey(group?.key ?? null)}
        includeCursorBatches={view.filter.includeCursorBatches}
        onIncludeCursorBatches={(includeCursorBatches) =>
          view.patchFilter({ includeCursorBatches })
        }
      />
      <EntriesSection
        entries={view.filtered}
        hasComments={view.hasComments}
        findingsOf={view.entryFindingsOf}
        sort={view.sort}
        onSortChange={view.setSort}
        selectedId={view.selected?.id}
        onSelect={view.select}
      />
      {view.selected && (
        <EntryDetailDrawer
          entry={view.selected}
          findings={view.entryFindingsOf(view.selected.id)}
          onClose={view.closeDetail}
          onPrevious={view.selectPrevious}
          onNext={view.selectNext}
        />
      )}
    </>
  );
}
