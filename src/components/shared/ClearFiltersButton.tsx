import { X } from "lucide-react";

interface ClearFiltersButtonProps {
  readonly onClick: () => void;
  readonly className?: string;
}

export function ClearFiltersButton({
  onClick,
  className = "",
}: ClearFiltersButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Clear all filters"
      className={`flex cursor-pointer items-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600 ${className}`}
    >
      <X className="h-4 w-4" aria-hidden="true" />
      Clear filters
    </button>
  );
}
