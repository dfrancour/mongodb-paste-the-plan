"use client";

import { Info } from "lucide-react";
import { forwardRef, type ComponentPropsWithoutRef } from "react";

interface InfoButtonProps extends Omit<
  ComponentPropsWithoutRef<"button">,
  "children"
> {
  /** Accessible label describing what information this button reveals */
  readonly "aria-label": string;
  /** Size variant - sm for inline metrics, default for stage headers */
  readonly size?: "sm" | "default";
}

/**
 * Standardized info button for tooltips throughout the application.
 *
 * Modern design approach:
 * - Subtle opacity-based visibility (unobtrusive until needed)
 * - Smooth transitions on hover
 * - No cursor change (default cursor feels more modern)
 *
 * Use with Tooltip component:
 * ```tsx
 * <Tooltip content="Explanation text">
 *   <InfoButton aria-label="What this means" />
 * </Tooltip>
 * ```
 */
export const InfoButton = forwardRef<HTMLButtonElement, InfoButtonProps>(
  function InfoButton(
    { "aria-label": ariaLabel, size = "default", className, ...props },
    ref,
  ) {
    const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

    return (
      <button
        ref={ref}
        type="button"
        className={`inline-flex items-center justify-center rounded-full p-0.5 text-neutral-400 opacity-60 transition-all duration-150 hover:text-neutral-600 hover:opacity-100 dark:text-neutral-500 dark:hover:text-neutral-300 ${className ?? ""}`}
        aria-label={ariaLabel}
        {...props}
      >
        <Info className={iconSize} />
      </button>
    );
  },
);
