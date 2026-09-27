import { X } from "lucide-react";

interface RemovableChipProps {
  readonly category: string;
  readonly label: string;
  readonly onRemove: () => void;
}

const LABEL_LIMIT = 80;

/** One active filter value, styled like the selected group row it may have come from. */
export function RemovableChip({
  category,
  label,
  onRemove,
}: RemovableChipProps) {
  return (
    <span className="bg-primary-light dark:bg-primary-dark inline-flex max-w-full items-center gap-1 rounded-full py-0.5 pr-1 pl-3 text-xs text-neutral-900 dark:text-neutral-100">
      <span className="text-neutral-600 dark:text-neutral-300">{category}</span>
      <span className="truncate font-mono" title={label}>
        {label.length > LABEL_LIMIT ? `${label.slice(0, LABEL_LIMIT)}…` : label}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Clear ${category} ${label}`}
        className="cursor-pointer rounded-full p-0.5 hover:bg-white/40 dark:hover:bg-black/20"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
