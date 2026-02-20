import { Tooltip } from "#components/common/Tooltip";
import { InfoButton } from "#components/shared/InfoButton";

export interface SelfTimeBarProps {
  executionTimeMillis: number;
  selfTimeMillis: number;
  rootExecutionTimeMillis: number;
}

export function SelfTimeBar({
  executionTimeMillis,
  selfTimeMillis,
  rootExecutionTimeMillis,
}: SelfTimeBarProps) {
  if (rootExecutionTimeMillis <= 0) return null;

  const totalPct = (executionTimeMillis / rootExecutionTimeMillis) * 100;
  const selfPct = (selfTimeMillis / rootExecutionTimeMillis) * 100;
  const childrenPct = totalPct - selfPct;

  return (
    <div className="mt-1 mb-1">
      <div className="mb-0.5 flex items-center gap-1 font-mono text-xs">
        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {selfTimeMillis}ms
        </span>
        <span className="text-neutral-500 dark:text-neutral-400">
          self time
        </span>
        <span className="text-neutral-500 dark:text-neutral-400">
          ({executionTimeMillis}ms total)
        </span>
        <Tooltip content="Total time (executionTimeMillis) is the cumulative time for this stage and all children. Self time is total time minus child stage time.">
          <InfoButton aria-label="Self time explanation" size="sm" />
        </Tooltip>
      </div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-600">
        {childrenPct > 0 && (
          <div
            className="bg-primary-light dark:bg-primary-dark h-full"
            style={{ width: `${childrenPct}%` }}
          />
        )}
        <div
          className="bg-primary dark:bg-primary-hover h-full"
          style={{ width: `${Math.max(selfPct, 0.5)}%` }}
        />
      </div>
    </div>
  );
}
