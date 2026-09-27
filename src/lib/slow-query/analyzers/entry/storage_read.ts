import type { EntryAnalyzer } from "../types";
import { formatBytes, formatDurationMs } from "#lib/utils/formatters";

/** Share of the total duration spent reading from storage before this is worth calling out. */
const STORAGE_READ_SHARE_THRESHOLD = 0.5;

/** Time spent waiting on the storage engine to read data not in cache. */
export const storageRead: EntryAnalyzer = {
  id: "entry:storage_read",
  label: "Waited on storage",
  analyze: (entry) => {
    const { timeReadingMicros, durationMillis, bytesRead, reslen } =
      entry.metrics;
    if (timeReadingMicros === undefined || !durationMillis) return [];
    const readingMs = timeReadingMicros / 1000;
    const share = readingMs / durationMillis;
    if (share < STORAGE_READ_SHARE_THRESHOLD) return [];
    const volume =
      bytesRead === undefined
        ? ""
        : reslen === undefined
          ? ` ${formatBytes(bytesRead)} were read from disk.`
          : ` ${formatBytes(bytesRead)} were read from disk to return ${formatBytes(reslen)}.`;
    return [
      {
        id: "storage-read",
        analyzerId: storageRead.id,
        layer: "entry",
        severity: share >= 0.75 ? "critical" : "warning",
        category: "performance",
        title: "Waited on storage",
        description: `${Math.round(share * 100)}% of durationMillis was spent reading from storage (${formatDurationMs(readingMs)} timeReadingMicros).${volume}`,
        suggestion:
          "The data this query touches is not in the WiredTiger cache. Narrow what it scans with a more selective index, or check whether the working set outgrew memory.",
      },
    ];
  },
};
