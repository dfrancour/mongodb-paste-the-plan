import type { SlowQueryFinding } from "#types/slow-query-analysis";
import { SeverityIcon } from "#components/common/SeverityIcon";

/** What stands out across the whole log, one line per finding. */
export function WorkloadFindings({
  findings,
}: {
  readonly findings: readonly SlowQueryFinding[];
}) {
  if (findings.length === 0) return null;
  return (
    <ul className="mt-3 space-y-1 text-sm">
      {findings.map((finding) => (
        <li
          key={finding.analyzerId}
          className="flex items-baseline gap-2 text-neutral-700 dark:text-neutral-300"
        >
          <SeverityIcon
            severity={finding.severity}
            className="h-4 w-4 self-center"
          />
          <span className="font-medium text-neutral-900 dark:text-neutral-100">
            {finding.title}
          </span>
          <span>{finding.description}</span>
        </li>
      ))}
    </ul>
  );
}
