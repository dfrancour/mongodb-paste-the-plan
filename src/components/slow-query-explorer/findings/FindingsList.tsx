import type { SlowQueryFinding } from "#types/slow-query-analysis";
import { SeverityIcon } from "#components/common/SeverityIcon";

interface FindingsListProps {
  readonly findings: readonly SlowQueryFinding[];
}

/** Findings with severity icon, title, description, and suggestion. */
export function FindingsList({ findings }: FindingsListProps) {
  if (findings.length === 0) return null;
  return (
    <ul className="space-y-2">
      {findings.map((finding) => (
        <li
          key={`${finding.analyzerId}:${finding.id}`}
          className="container-secondary flex gap-3 p-3"
        >
          <SeverityIcon
            severity={finding.severity}
            className="mt-0.5 h-5 w-5"
          />
          <div className="min-w-0 text-sm">
            <div className="font-medium text-neutral-900 dark:text-neutral-100">
              {finding.title}
            </div>
            <div className="text-neutral-700 dark:text-neutral-300">
              {finding.description}
            </div>
            {finding.suggestion && (
              <div className="mt-1 text-neutral-500 dark:text-neutral-400">
                {finding.suggestion}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
