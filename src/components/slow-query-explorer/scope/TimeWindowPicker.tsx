"use client";

import type { TimeWindow } from "#lib/slow-query";
import { DropdownButton } from "#components/common/DropdownButton";

interface TimeWindowPickerProps {
  readonly value: TimeWindow;
  readonly captureStart: Date | undefined;
  readonly captureEnd: Date | undefined;
  readonly onChange: (value: TimeWindow) => void;
}

/** `datetime-local` shows no zone, so values are written and read as UTC. */
function toInputValue(date: Date | undefined | null): string {
  return date ? date.toISOString().slice(0, 19) : "";
}

/**
 * An input reading, as a bound. The capture's own bound, or an empty or
 * malformed value, is no bound at all; anything outside the capture is
 * pulled back to its edge.
 */
export function boundFromInput(
  text: string,
  captureStart: Date | undefined,
  captureEnd: Date | undefined,
): Date | null {
  if (!text) return null;
  const date = new Date(`${text}Z`);
  if (!Number.isFinite(date.getTime())) return null;
  if (text === toInputValue(captureStart) || text === toInputValue(captureEnd))
    return null;
  if (captureStart && date < captureStart) return captureStart;
  if (captureEnd && date > captureEnd) return captureEnd;
  return date;
}

const inputClass =
  "w-full rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100";

export function TimeWindowPicker({
  value,
  captureStart,
  captureEnd,
  onChange,
}: TimeWindowPickerProps) {
  const active = value.start !== null || value.end !== null;
  const bound = (text: string) =>
    boundFromInput(text, captureStart, captureEnd);
  return (
    <DropdownButton label="Time (UTC)" active={active} widthClass="w-80">
      <div className="space-y-3 p-1">
        <label className="block text-sm">
          <span className="mb-1 block text-neutral-700 dark:text-neutral-300">
            From
          </span>
          <input
            type="datetime-local"
            step={1}
            value={toInputValue(value.start ?? captureStart)}
            min={toInputValue(captureStart)}
            max={toInputValue(value.end ?? captureEnd)}
            aria-label="From (UTC)"
            onChange={(e) =>
              onChange({ ...value, start: bound(e.target.value) })
            }
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-neutral-700 dark:text-neutral-300">
            Until
          </span>
          <input
            type="datetime-local"
            step={1}
            value={toInputValue(value.end ?? captureEnd)}
            min={toInputValue(value.start ?? captureStart)}
            max={toInputValue(captureEnd)}
            aria-label="Until (UTC)"
            onChange={(e) => onChange({ ...value, end: bound(e.target.value) })}
            className={inputClass}
          />
        </label>
      </div>
    </DropdownButton>
  );
}
