interface MagnitudeBarProps {
  readonly value: number | undefined;
  /** The largest value in the column; the bar is its share of this. */
  readonly max: number;
  readonly format: (value: number) => string;
  /** Share of the column's total, 0..1, shown after the bar. */
  readonly share?: number;
}

/**
 * A number beside a bar scaled to the column's largest value, so a column
 * of durations reads as a ranking at a glance.
 */
export function MagnitudeBar({ value, max, format, share }: MagnitudeBarProps) {
  if (value === undefined) return <span className="text-neutral-400">—</span>;
  const percent = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-right tabular-nums">
        {format(value)}
      </span>
      <div className="h-1.5 w-40 shrink-0" aria-hidden="true">
        <div
          className="bg-primary h-1.5 rounded-full"
          style={{ width: `${Math.max(1, percent)}%` }}
        />
      </div>
      {share !== undefined && (
        <span className="w-10 shrink-0 text-right text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
          {Math.round(share * 100)}%
        </span>
      )}
    </div>
  );
}
