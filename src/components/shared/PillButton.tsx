import type { ReactNode } from "react";

interface PillButtonProps {
  readonly children: ReactNode;
  readonly isSelected: boolean;
  readonly onClick: () => void;
  readonly ariaPressed?: boolean;
}

/**
 * Reusable pill-style toggle button for filters
 */
export function PillButton({
  children,
  isSelected,
  onClick,
  ariaPressed,
}: PillButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ariaPressed ?? isSelected}
      className={`cursor-pointer rounded-full px-3 py-1 text-sm font-medium transition-colors ${
        isSelected
          ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
      }`}
    >
      {children}
    </button>
  );
}
