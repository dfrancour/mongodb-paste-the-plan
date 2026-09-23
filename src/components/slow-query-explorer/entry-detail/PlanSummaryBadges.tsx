import Link from "next/link";
import type { PlanSummaryStage } from "#types/slow-query";
import { glossaryHrefForStage } from "#lib/slow-query";

interface PlanSummaryBadgesProps {
  readonly stages: readonly PlanSummaryStage[];
}

/** Plan-summary stage tokens, each linked to its Stage Glossary entry when the catalog knows it. */
export function PlanSummaryBadges({ stages }: PlanSummaryBadgesProps) {
  if (stages.length === 0) {
    return <span className="text-neutral-400">not recorded</span>;
  }
  return (
    <span className="flex flex-wrap gap-1.5">
      {stages.map((stage, index) => {
        const href = glossaryHrefForStage(stage.stage);
        const token = (
          <span
            className={`rounded border px-1.5 py-0.5 font-mono text-xs ${
              stage.stage === "COLLSCAN"
                ? "border-red-200 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-900/40 dark:text-red-300"
                : "border-neutral-200 bg-neutral-50 text-neutral-800 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200"
            }`}
          >
            {stage.stage}
            {stage.keyPattern && (
              <span className="ml-1 opacity-80">{stage.keyPattern}</span>
            )}
          </span>
        );
        return href ? (
          <Link
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={`Open ${stage.stage} in the Stage Glossary`}
            className="hover:underline"
          >
            {token}
          </Link>
        ) : (
          <span key={index}>{token}</span>
        );
      })}
    </span>
  );
}
