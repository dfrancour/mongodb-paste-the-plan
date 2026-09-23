import type { SlowQueryEntry } from "#types/slow-query";

/** Lower-cased text an entry is searchable by: intent fields, not session noise. */
export function entrySearchText(entry: SlowQueryEntry): string {
  return [
    entry.namespace,
    entry.operation,
    entry.comment,
    entry.appName,
    entry.planSummary,
    entry.remote,
    JSON.stringify(entry.command),
    entry.originatingCommand ? JSON.stringify(entry.originatingCommand) : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
