import { isRecord, type UnknownRecord } from "./objects";

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const INDENT = "  ";

/**
 * Render a logged command value as mongosh source. Extended JSON wrappers
 * become their shell constructors (`ISODate`, `ObjectId`, ...), so the
 * result runs as pasted.
 */
export function shellLiteral(value: unknown, depth = 0): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return block(
      "[",
      "]",
      value.map((item) => shellLiteral(item, depth + 1)),
      depth,
    );
  }
  if (!isRecord(value)) return String(value);
  const record = value;
  const special = extendedJsonConstructor(record);
  if (special !== undefined) return special;
  const entries = Object.entries(record);
  if (entries.length === 0) return "{}";
  return block(
    "{",
    "}",
    entries.map(
      ([key, item]) => `${shellKey(key)}: ${shellLiteral(item, depth + 1)}`,
    ),
    depth,
  );
}

function block(
  open: string,
  close: string,
  lines: string[],
  depth: number,
): string {
  const inner = INDENT.repeat(depth + 1);
  return `${open}\n${lines.map((line) => inner + line).join(",\n")}\n${INDENT.repeat(depth)}${close}`;
}

function shellKey(key: string): string {
  return IDENTIFIER.test(key) ? key : JSON.stringify(key);
}

function extendedJsonConstructor(record: UnknownRecord): string | undefined {
  const keys = Object.keys(record);
  if (keys.length !== 1) return undefined;
  const key = keys[0]!;
  const inner = record[key];
  switch (key) {
    case "$oid":
      return `ObjectId(${JSON.stringify(inner)})`;
    case "$date":
      return dateConstructor(inner);
    case "$numberLong":
      return `NumberLong(${JSON.stringify(String(inner))})`;
    case "$numberDecimal":
      return `NumberDecimal(${JSON.stringify(String(inner))})`;
    case "$numberInt":
    case "$numberDouble":
      return String(inner);
    case "$uuid":
      return `UUID(${JSON.stringify(inner)})`;
    case "$binary":
      return binaryConstructor(inner);
    case "$timestamp":
      return isRecord(inner)
        ? `Timestamp(${Number(inner.t)}, ${Number(inner.i)})`
        : undefined;
    case "$regularExpression":
      return isRecord(inner) ? regexConstructor(inner) : undefined;
    case "$minKey":
      return "MinKey()";
    case "$maxKey":
      return "MaxKey()";
    default:
      return undefined;
  }
}

function dateConstructor(inner: unknown): string | undefined {
  if (typeof inner === "string") return `ISODate(${JSON.stringify(inner)})`;
  if (typeof inner === "number") return `new Date(${inner})`;
  if (isRecord(inner) && inner.$numberLong !== undefined) {
    return `new Date(${Number(inner.$numberLong)})`;
  }
  return undefined;
}

/** A regex literal, or `new RegExp(...)` when the pattern cannot sit between slashes. */
function regexConstructor(inner: UnknownRecord): string {
  const pattern = String(inner.pattern);
  const options = String(inner.options ?? "");
  if (/[\n\r]/.test(pattern)) {
    return `new RegExp(${JSON.stringify(pattern)}, ${JSON.stringify(options)})`;
  }
  return `/${pattern.replace(/\//g, "\\/")}/${options}`;
}

function binaryConstructor(inner: unknown): string | undefined {
  if (!isRecord(inner)) return undefined;
  const subType = parseInt(String(inner.subType ?? "0"), 16);
  return `BinData(${subType}, ${JSON.stringify(inner.base64)})`;
}
