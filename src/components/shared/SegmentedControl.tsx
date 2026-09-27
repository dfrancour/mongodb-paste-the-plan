"use client";

import { useRef, type KeyboardEvent } from "react";

interface SegmentedOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

interface SegmentedControlProps<T extends string> {
  readonly label: string;
  readonly options: readonly SegmentedOption<T>[];
  readonly selected: T;
  readonly onChange: (value: T) => void;
}

const STEP_BY_KEY: Readonly<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowUp: -1,
  ArrowRight: 1,
  ArrowDown: 1,
};

/**
 * Joined buttons for an exclusive choice among a few options. Behaves as a
 * radio group: Tab lands on the selected option and the arrow keys move
 * the selection.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  selected,
  onChange,
}: SegmentedControlProps<T>) {
  const groupRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = STEP_BY_KEY[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const current = options.findIndex((option) => option.value === selected);
    const next = (current + step + options.length) % options.length;
    onChange(options[next]!.value);
    groupRef.current
      ?.querySelectorAll<HTMLButtonElement>("[role=radio]")
      [next]?.focus();
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="inline-flex overflow-hidden rounded-md border border-neutral-300 text-sm font-medium dark:border-neutral-600"
    >
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={`cursor-pointer px-3 py-1 transition-colors not-first:border-l not-first:border-neutral-300 dark:not-first:border-neutral-600 ${
              isSelected
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "bg-white text-neutral-700 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
