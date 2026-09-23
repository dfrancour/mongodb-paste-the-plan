"use client";

import { useState } from "react";
import type { EntryFilter } from "#lib/slow-query";
import { parseDurationMs } from "#lib/slow-query";
import { DropdownButton } from "#components/common/DropdownButton";

type ThresholdKey =
  | "minDurationMs"
  | "maxDurationMs"
  | "minDocsExamined"
  | "maxDocumentEfficiency";

export type Thresholds = Pick<EntryFilter, ThresholdKey>;

interface ThresholdsPickerProps {
  readonly values: Thresholds;
  readonly onChange: (patch: Partial<Thresholds>) => void;
}

interface Field {
  readonly key: ThresholdKey;
  readonly label: string;
  readonly placeholder: string;
  readonly parse: (text: string) => number | undefined;
}

const parseNumber = (text: string): number | undefined => {
  const value = Number(text.replace(/[,\s_]/g, ""));
  return text.trim() !== "" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
};

/** `10`, `10%`, or `0.1` all mean ten percent. */
const parsePercent = (text: string): number | undefined => {
  const value = parseNumber(text.replace("%", ""));
  if (value === undefined || value > 100) return undefined;
  return value > 1 || text.includes("%") ? value / 100 : value;
};

const FIELDS: readonly Field[] = [
  {
    key: "minDurationMs",
    label: "durationMillis at least",
    placeholder: "1s, 500ms, 2 min",
    parse: parseDurationMs,
  },
  {
    key: "maxDurationMs",
    label: "durationMillis at most",
    placeholder: "30s",
    parse: parseDurationMs,
  },
  {
    key: "minDocsExamined",
    label: "docsExamined at least",
    placeholder: "10000",
    parse: parseNumber,
  },
  {
    key: "maxDocumentEfficiency",
    label: "Document Efficiency at most",
    placeholder: "10%",
    parse: parsePercent,
  },
];

/** Numeric cut-offs. Text is kept as typed; an unparseable field filters nothing and is outlined. */
export function ThresholdsPicker({ values, onChange }: ThresholdsPickerProps) {
  const [texts, setTexts] = useState<Record<ThresholdKey, string>>({
    minDurationMs: "",
    maxDurationMs: "",
    minDocsExamined: "",
    maxDocumentEfficiency: "",
  });

  return (
    <DropdownButton
      label="Thresholds"
      active={FIELDS.some((f) => values[f.key] !== null)}
      widthClass="w-80"
    >
      <div className="space-y-3 p-1">
        {FIELDS.map((field) => {
          const typed = texts[field.key];
          const parsed = field.parse(typed) ?? null;
          // Typed text stays while it is what the filter holds, or while it is
          // unparseable; a filter cleared elsewhere empties the box.
          const text =
            parsed === values[field.key] || parsed === null ? typed : "";
          const invalid = text.trim() !== "" && parsed === null;
          return (
            <label key={field.key} className="block text-sm">
              <span className="mb-1 block text-neutral-700 dark:text-neutral-300">
                {field.label}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={text}
                placeholder={field.placeholder}
                aria-label={field.label}
                aria-invalid={invalid}
                onChange={(e) => {
                  setTexts((t) => ({ ...t, [field.key]: e.target.value }));
                  onChange({
                    [field.key]: field.parse(e.target.value) ?? null,
                  });
                }}
                className={`w-full rounded-lg border bg-white px-2 py-1.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:outline-none dark:bg-neutral-800 dark:text-neutral-100 ${
                  invalid
                    ? "border-performance-poor"
                    : "border-neutral-300 dark:border-neutral-600"
                }`}
              />
            </label>
          );
        })}
      </div>
    </DropdownButton>
  );
}
