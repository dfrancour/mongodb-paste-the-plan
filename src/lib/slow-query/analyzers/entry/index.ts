import type { SlowQueryEntry } from "#types/slow-query";
import type { SlowQueryFinding } from "#types/slow-query-analysis";
import { bySeverity, type EntryAnalyzer } from "../types";
import { collectionScan } from "./collection_scan";
import { lowDocumentEfficiency } from "./low_document_efficiency";
import { inMemorySort } from "./in_memory_sort";
import { diskUse } from "./disk_use";
import { replanned } from "./replanned";
import { truncatedCommand } from "./truncated_command";
import { queueWait } from "./queue_wait";
import { writeConflicts } from "./write_conflicts";
import { planningTime } from "./planning_time";
import { storageRead } from "./storage_read";

export const ENTRY_ANALYZERS: readonly EntryAnalyzer[] = [
  collectionScan,
  lowDocumentEfficiency,
  inMemorySort,
  diskUse,
  replanned,
  truncatedCommand,
  queueWait,
  writeConflicts,
  planningTime,
  storageRead,
];

export function analyzeEntry(entry: SlowQueryEntry): SlowQueryFinding[] {
  return ENTRY_ANALYZERS.flatMap((analyzer) => analyzer.analyze(entry)).sort(
    bySeverity,
  );
}
