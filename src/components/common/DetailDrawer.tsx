"use client";

import { useEffect, useId } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";

interface DetailDrawerProps {
  readonly title: React.ReactNode;
  readonly onClose: () => void;
  readonly onPrevious?: () => void;
  readonly onNext?: () => void;
  readonly children: React.ReactNode;
}

const navButtonClass =
  "btn-secondary flex h-8 w-8 items-center justify-center p-0";

/**
 * Right-side panel for stepping through a list while the list stays
 * visible. Render it only while open. Escape closes; j/k and the arrow keys
 * step when the focus is not in a text field.
 */
export function DetailDrawer({
  title,
  onClose,
  onPrevious,
  onNext,
  children,
}: DetailDrawerProps) {
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTextEntry(event.target)) return;
      if (event.key === "Escape") onClose();
      else if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        onNext?.();
      } else if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        onPrevious?.();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, onNext, onPrevious]);

  return (
    <aside
      role="dialog"
      aria-labelledby={titleId}
      className="container-primary fixed inset-y-0 right-0 z-30 flex w-full flex-col rounded-none border-l shadow-2xl sm:w-[min(760px,60vw)]"
    >
      <div className="flex items-center gap-2 border-b border-neutral-200 p-3 dark:border-neutral-700">
        <div
          id={titleId}
          className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100"
        >
          {title}
        </div>
        {onPrevious && (
          <button
            type="button"
            onClick={onPrevious}
            className={navButtonClass}
            title="Previous (k)"
            aria-label="Previous"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        )}
        {onNext && (
          <button
            type="button"
            onClick={onNext}
            className={navButtonClass}
            title="Next (j)"
            aria-label="Next"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className={navButtonClass}
          title="Close (Esc)"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="scrollbar-subtle flex-1 overflow-auto p-4">
        {children}
      </div>
    </aside>
  );
}

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}
