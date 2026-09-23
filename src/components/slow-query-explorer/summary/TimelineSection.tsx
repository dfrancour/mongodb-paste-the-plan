"use client";

import { ChartNoAxesColumn } from "lucide-react";
import type {
  Timeline,
  TimelineMetric,
  TimelineMetricId,
  TimeWindow,
} from "#lib/slow-query";
import { SectionCard } from "#components/common/SectionCard";
import { Icon } from "#components/common/Icon";
import { SegmentedControl } from "#components/shared/SegmentedControl";
import { TimelineChart } from "./TimelineChart";

interface TimelineSectionProps {
  readonly timeline: Timeline;
  /** Metrics the log records; the toggle appears once there is a choice. */
  readonly metrics: readonly TimelineMetric[];
  readonly onSelectMetric: (id: TimelineMetricId) => void;
  readonly selectedId: number | undefined;
  /** Entries to pick out on the chart while a group row is hovered. */
  readonly highlightedIds: ReadonlySet<number>;
  readonly onBrush: (window: TimeWindow) => void;
  readonly onSelectEntry: (id: number) => void;
}

export function TimelineSection({
  metrics,
  onSelectMetric,
  ...chart
}: TimelineSectionProps) {
  return (
    <SectionCard
      title="Timeline"
      icon={<Icon icon={ChartNoAxesColumn} variant="primary" />}
      headerAction={
        metrics.length > 1 && (
          <SegmentedControl<TimelineMetricId>
            label="Timeline measure"
            options={metrics.map((m) => ({ value: m.id, label: m.label }))}
            selected={chart.timeline.metric.id}
            onChange={onSelectMetric}
          />
        )
      }
    >
      <TimelineChart {...chart} />
    </SectionCard>
  );
}
