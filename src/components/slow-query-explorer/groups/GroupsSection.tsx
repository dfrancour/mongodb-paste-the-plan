"use client";

import { Layers } from "lucide-react";
import type {
  GroupDimension,
  GroupDimensionId,
  GroupSort,
  QueryGroup,
} from "#lib/slow-query";
import type { SlowQueryFinding } from "#types/slow-query-analysis";
import { SectionCard } from "#components/common/SectionCard";
import { Icon } from "#components/common/Icon";
import { FilterPills } from "#components/shared/FilterPills";
import { GroupTable } from "./GroupTable";

interface GroupsSectionProps {
  readonly dimensions: readonly GroupDimension[];
  readonly dimension: GroupDimension;
  readonly onSelectDimension: (id: GroupDimensionId) => void;
  readonly groups: readonly QueryGroup[];
  readonly findingsOf: (key: string) => readonly SlowQueryFinding[];
  readonly sort: GroupSort;
  readonly onSortChange: (sort: GroupSort) => void;
  readonly selectedKeys: ReadonlySet<string>;
  readonly onSelect: (group: QueryGroup) => void;
  readonly onHover: (group: QueryGroup | null) => void;
  readonly includeCursorBatches: boolean;
  readonly onIncludeCursorBatches: (include: boolean) => void;
}

export function GroupsSection({
  dimensions,
  dimension,
  onSelectDimension,
  groups,
  findingsOf,
  sort,
  onSortChange,
  selectedKeys,
  onSelect,
  onHover,
  includeCursorBatches,
  onIncludeCursorBatches,
}: GroupsSectionProps) {
  return (
    <SectionCard
      title="Query groups"
      icon={<Icon icon={Layers} variant="primary" />}
      headerAction={
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={includeCursorBatches}
            onChange={(e) => onIncludeCursorBatches(e.target.checked)}
            className="accent-primary h-4 w-4"
          />
          Include getMore batches
        </label>
      }
    >
      <GroupTable
        groups={groups}
        findingsOf={findingsOf}
        dimension={dimension}
        sort={sort}
        selectedKeys={selectedKeys}
        onSortChange={onSortChange}
        onSelect={onSelect}
        onHover={onHover}
        toolbar={
          <FilterPills<GroupDimensionId>
            mode="single"
            options={dimensions.map((d) => ({ value: d.id, label: d.label }))}
            selected={dimension.id}
            onChange={onSelectDimension}
            label="Group by"
          />
        }
      />
    </SectionCard>
  );
}
