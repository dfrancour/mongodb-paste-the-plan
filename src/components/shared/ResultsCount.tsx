interface ResultsCountProps {
  readonly filtered: number;
  readonly total: number;
  readonly itemName?: string;
  readonly className?: string;
}

export function ResultsCount({
  filtered,
  total,
  itemName = "items",
  className = "",
}: ResultsCountProps) {
  return (
    <div
      className={`text-sm text-neutral-600 dark:text-neutral-400 ${className}`}
    >
      Showing {filtered} of {total} {itemName}
    </div>
  );
}
