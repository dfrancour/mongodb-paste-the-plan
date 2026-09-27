const UNITS: Readonly<Record<string, number>> = {
  ms: 1,
  s: 1000,
  sec: 1000,
  m: 60_000,
  min: 60_000,
  h: 3_600_000,
};

/** Parse "500", "1.5s", "2 min", "1h" into milliseconds; undefined when it is not a duration. */
export function parseDurationMs(text: string): number | undefined {
  const match = /^\s*(\d+(?:\.\d+)?)\s*([a-z]*)\s*$/i.exec(text);
  if (!match) return undefined;
  const unit = match[2]!.toLowerCase();
  const scale = unit === "" ? 1 : UNITS[unit];
  if (scale === undefined) return undefined;
  return Number(match[1]) * scale;
}
