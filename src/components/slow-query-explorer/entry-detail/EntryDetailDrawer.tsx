"use client";

import type { SlowQueryEntry } from "#types/slow-query";
import type { SlowQueryFinding } from "#types/slow-query-analysis";
import { DetailDrawer } from "#components/common/DetailDrawer";
import { TabViewContainer } from "#components/common/TabViewContainer";
import { TabJSONViewer } from "#components/shared/TabJSONViewer";
import { formatDurationMs } from "#lib/utils/formatters";
import { OperationPill } from "../entries/OperationPill";
import { FindingsList } from "../findings/FindingsList";
import { EntryMetrics } from "./EntryMetrics";
import { KeyMetrics } from "../metrics/KeyMetrics";
import { documentEfficiencyOf, indexEfficiencyOf } from "#lib/slow-query";
import { EntryCommand } from "./EntryCommand";
import { PlanSummaryBadges } from "./PlanSummaryBadges";

interface EntryDetailDrawerProps {
  readonly entry: SlowQueryEntry;
  readonly findings: readonly SlowQueryFinding[];
  readonly onClose: () => void;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
}

export function EntryDetailDrawer({
  entry,
  findings,
  onClose,
  onPrevious,
  onNext,
}: EntryDetailDrawerProps) {
  return (
    <DetailDrawer
      onClose={onClose}
      onPrevious={onPrevious}
      onNext={onNext}
      title={
        <span className="flex items-center gap-2">
          <OperationPill entry={entry} />
          <span className="truncate">{entry.namespace}</span>
          <span className="text-neutral-400">·</span>
          <span>{formatDurationMs(entry.metrics.durationMillis)}</span>
        </span>
      }
    >
      <TabViewContainer
        tabLabels={{ analysis: "Details", json: "Raw log entry" }}
        analysisContent={
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                planSummary
              </span>
              <PlanSummaryBadges stages={entry.planSummaryStages} />
            </div>
            <KeyMetrics
              values={{
                ...entry.metrics,
                documentEfficiency: documentEfficiencyOf(entry.metrics),
                indexEfficiency: indexEfficiencyOf(entry.metrics),
              }}
            />
            <FindingsList findings={findings} />
            <EntryMetrics entry={entry} />
            <EntryCommand entry={entry} />
          </div>
        }
        jsonContent={<TabJSONViewer data={entry.raw} maxHeight={600} />}
      />
    </DetailDrawer>
  );
}
