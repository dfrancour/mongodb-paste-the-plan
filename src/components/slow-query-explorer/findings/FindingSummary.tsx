import type { SlowQueryFinding } from "#types/slow-query-analysis";
import { SeverityIcon } from "#components/common/SeverityIcon";

interface FindingSummaryProps {
  /** Findings ordered most severe first. */
  readonly findings: readonly SlowQueryFinding[];
}

/** The most severe finding's icon and, past one, how many there are; titles hover. */
export function FindingSummary({ findings }: FindingSummaryProps) {
  const first = findings[0];
  if (!first) return null;
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap"
      title={findings.map((f) => f.title).join("\n")}
      aria-label={findings.map((f) => f.title).join(", ")}
    >
      <SeverityIcon severity={first.severity} className="h-3.5 w-3.5" />
      {findings.length > 1 && (
        <span className="text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
          {findings.length}
        </span>
      )}
    </span>
  );
}
