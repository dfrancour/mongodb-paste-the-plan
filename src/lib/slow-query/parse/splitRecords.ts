/**
 * Split raw log text into JSON records.
 *
 * Accepts JSON Lines (one object per line), a JSON array, or a single
 * object. Invalid lines are reported by 1-based line number rather than
 * aborting the load.
 */

import { SlowQueryParseError } from "../errors";

interface SplitResult {
  readonly records: readonly unknown[];
  readonly invalidLines: readonly number[];
}

export function splitRecords(text: string): SplitResult {
  const clean = text.replace(/^﻿/, "");
  const trimmed = clean.trim();
  if (!trimmed) return { records: [], invalidLines: [] };
  if (trimmed.startsWith("[")) return splitArray(trimmed);
  const single = tryParse(trimmed);
  if (single !== undefined) return { records: [single], invalidLines: [] };
  return splitLines(clean);
}

function splitArray(text: string): SplitResult {
  const parsed = tryParse(text);
  if (!Array.isArray(parsed)) {
    throw new SlowQueryParseError(
      "Input starts with '[' but is not a JSON array",
    );
  }
  return { records: parsed, invalidLines: [] };
}

function splitLines(text: string): SplitResult {
  const records: unknown[] = [];
  const invalidLines: number[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    const parsed = tryParse(line);
    if (parsed === undefined) invalidLines.push(index + 1);
    else records.push(parsed);
  });
  if (records.length === 0) {
    throw new SlowQueryParseError("No valid JSON found in input");
  }
  return { records, invalidLines };
}

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}
