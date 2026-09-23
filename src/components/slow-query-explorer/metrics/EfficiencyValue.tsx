import type { FindingSeverity } from "#types/analysis";
import { formatEfficiency } from "#lib/utils/planEfficiencyUtils";

interface EfficiencyValueProps {
  /** nreturned over an examined count, 0..1; undefined when not computable. */
  readonly value: number | undefined;
  /** Colors the value the way Paste the Plan colors its efficiency findings. */
  readonly severity?: FindingSeverity;
  readonly className?: string;
}

const COLOR: Record<FindingSeverity | "good", string> = {
  critical: "text-performance-poor",
  warning: "text-performance-moderate",
  info: "text-performance-good",
  good: "text-performance-good",
};

/** An efficiency as a percentage, green unless a finding says otherwise. */
export function EfficiencyValue({
  value,
  severity,
  className = "",
}: EfficiencyValueProps) {
  if (value === undefined) {
    return <span className="text-neutral-400">—</span>;
  }
  return (
    <span className={`${COLOR[severity ?? "good"]} ${className}`}>
      {formatEfficiency(value)}
    </span>
  );
}
