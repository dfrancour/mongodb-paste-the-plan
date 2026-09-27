import { isRecord, mapObject } from "../objects";
import { typeToken } from "./typeToken";

/** Canonicalize an aggregation expression: field paths stay, literals become type tokens. */
export function canonicalExpression(value: unknown): unknown {
  if (typeof value === "string" && value.startsWith("$")) return value;
  if (Array.isArray(value)) return value.map(canonicalExpression);
  if (isRecord(value)) {
    return mapObject(value, (item, key) => {
      if (key === "$literal" || key === "$const") return typeToken(item);
      if (key === "$meta") return item;
      return canonicalExpression(item);
    });
  }
  return typeToken(value);
}

/** Keep key order significant (sort specs, hints, index bounds). */
export function canonicalOrdered(value: unknown): unknown {
  return isRecord(value) ? { $ordered: Object.entries(value) } : value;
}

const INCLUSION_VALUES = new Set<unknown>([0, 1, true, false]);

export function canonicalProjection(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return mapObject(
    value,
    (item) => (INCLUSION_VALUES.has(item) ? item : canonicalExpression(item)),
    true,
  );
}
