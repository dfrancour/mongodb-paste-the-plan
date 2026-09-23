"use client";

import { List } from "lucide-react";
import type { SlowQueryEntry } from "#types/slow-query";
import type { SlowQueryFinding } from "#types/slow-query-analysis";
import type { EntrySort } from "#lib/slow-query";
import { SectionCard } from "#components/common/SectionCard";
import { Icon } from "#components/common/Icon";
import { EntryTable } from "./EntryTable";

interface EntriesSectionProps {
  readonly entries: readonly SlowQueryEntry[];
  readonly hasComments: boolean;
  readonly findingsOf: (id: number) => readonly SlowQueryFinding[];
  readonly sort: EntrySort;
  readonly onSortChange: (sort: EntrySort) => void;
  readonly selectedId: number | undefined;
  readonly onSelect: (id: number) => void;
}

export function EntriesSection(props: EntriesSectionProps) {
  return (
    <SectionCard
      title="Log entries"
      icon={<Icon icon={List} variant="primary" />}
    >
      <EntryTable {...props} />
    </SectionCard>
  );
}
