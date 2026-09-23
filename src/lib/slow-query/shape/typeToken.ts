import { isRecord } from "../objects";

const EJSON_TYPE_KEY =
  /^\$(oid|date|uuid|numberLong|numberInt|numberDouble|numberDecimal|binary|timestamp|regularExpression)$/;

export function isEjsonTypeObject(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  return keys.length === 1 && EJSON_TYPE_KEY.test(keys[0]!);
}

/**
 * Replace a literal value with a token naming its type. Documents keep key
 * order (`{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` differ as equality operands).
 */
export function typeToken(value: unknown): unknown {
  if (value === null) return "?null";
  if (Array.isArray(value)) return value.map(typeToken);
  if (isRecord(value)) {
    if (isEjsonTypeObject(value)) return `?${Object.keys(value)[0]!.slice(1)}`;
    return {
      $document: Object.entries(value).map(([key, item]) => [
        key,
        typeToken(item),
      ]),
    };
  }
  return `?${typeof value}`;
}

/**
 * One token for a whole array, so `$in` lists of different lengths share a
 * shape: `?array<?string>` when every element has the same token, else `?array`.
 */
export function arrayToken(values: readonly unknown[]): string {
  const tokens = new Set(values.map((value) => typeToken(value)));
  const [only] = tokens;
  return tokens.size === 1 && typeof only === "string"
    ? `?array<${only}>`
    : "?array";
}
