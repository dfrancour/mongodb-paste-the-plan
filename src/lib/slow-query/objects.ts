export type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Map over an object's values, optionally with sorted keys. */
export function mapObject(
  value: UnknownRecord,
  fn: (item: unknown, key: string) => unknown,
  sortKeys = false,
): UnknownRecord {
  const keys = sortKeys ? Object.keys(value).sort() : Object.keys(value);
  const out: UnknownRecord = {};
  for (const key of keys) out[key] = fn(value[key], key);
  return out;
}

/** Finite, non-negative number or undefined. Never coerces booleans or strings. */
export function nonNegativeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

export function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** Code-unit order, so a canonical key does not depend on the locale. */
export function compareByJson(a: unknown, b: unknown): number {
  const left = JSON.stringify(a);
  const right = JSON.stringify(b);
  return left === right ? 0 : left < right ? -1 : 1;
}
