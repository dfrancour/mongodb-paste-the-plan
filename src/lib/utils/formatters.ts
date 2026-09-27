/**
 * Display formatting for durations, byte counts, and counts.
 * Undefined renders as an em dash so "not recorded" is visible, not zero.
 */

const NOT_AVAILABLE = "—";

export function formatDurationMs(ms: number | undefined): string {
  if (ms === undefined) return NOT_AVAILABLE;
  if (ms < 1000) return `${Number(ms.toFixed(1))} ms`;
  const seconds = ms / 1000;
  if (seconds < 120) return `${seconds.toFixed(1)} s`;
  const minutes = seconds / 60;
  if (minutes < 120) return `${minutes.toFixed(1)} min`;
  return `${(minutes / 60).toFixed(1)} h`;
}

export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined) return NOT_AVAILABLE;
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

export function formatCount(value: number | undefined): string {
  return value === undefined
    ? NOT_AVAILABLE
    : Math.round(value).toLocaleString();
}

export function formatUtcTimestamp(date: Date | undefined): string {
  return date
    ? date.toISOString().replace("T", " ").slice(0, 19)
    : NOT_AVAILABLE;
}
