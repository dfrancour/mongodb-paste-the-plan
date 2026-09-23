import type { SlowQueryEntry } from "#types/slow-query";
import { isRecord, type UnknownRecord } from "./objects";
import { shellLiteral } from "./shellLiteral";

/**
 * Render the logged query as the mongosh call that issued it, collection
 * and modifiers broken out. Undefined for what has no shell form: inserts,
 * unattributed cursor batches, non-query commands, unknown namespace.
 */
export function buildShellCommand(entry: SlowQueryEntry): string | undefined {
  const target = collectionTarget(entry.namespace);
  if (!target) return undefined;
  const command = entry.originatingCommand ?? entry.command;
  const call = shellCall(command, entry.logicalOperation);
  if (!call) return undefined;
  return `${target}${call}`;
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

function collectionTarget(namespace: string): string | undefined {
  const dot = namespace.indexOf(".");
  if (dot <= 0 || dot === namespace.length - 1) return undefined;
  const db = namespace.slice(0, dot);
  const collection = namespace.slice(dot + 1);
  if (collection === "$cmd") return undefined;
  const collectionAccess = IDENTIFIER.test(collection)
    ? `.${collection}`
    : `.getCollection(${literal(collection)})`;
  return `db.getSiblingDB(${literal(db)})${collectionAccess}`;
}

function shellCall(
  command: UnknownRecord,
  operation: string,
): string | undefined {
  switch (operation) {
    case "find":
      return findCall(command);
    case "aggregate":
      return `.aggregate(${literal(command.pipeline ?? [])}${optionsArgument(command, ["allowDiskUse", "collation", "hint", "let"])})`;
    case "count":
      return `.count(${literal(command.query ?? {})})`;
    case "distinct":
      return `.distinct(${literal(command.key ?? "")}, ${literal(command.query ?? {})})`;
    case "update":
      return updateCall(command);
    case "delete":
      return deleteCall(command);
    case "findAndModify":
      return `.findAndModify(${literal(pick(command, ["query", "sort", "update", "remove", "new", "fields", "upsert", "arrayFilters"]))})`;
    default:
      return undefined;
  }
}

function findCall(command: UnknownRecord): string {
  const parts = [
    `.find(${literal(command.filter ?? {})}${command.projection ? `, ${literal(command.projection)}` : ""})`,
  ];
  for (const modifier of [
    "sort",
    "skip",
    "limit",
    "hint",
    "collation",
  ] as const) {
    if (command[modifier] !== undefined) {
      parts.push(`.${modifier}(${literal(command[modifier])})`);
    }
  }
  return parts.join("");
}

function updateCall(command: UnknownRecord): string | undefined {
  const statement = firstStatement(command.updates) ?? command;
  if (statement.q === undefined || statement.u === undefined) return undefined;
  return `.update(${literal(statement.q)}, ${literal(statement.u)}${optionsArgument(statement, ["multi", "upsert", "arrayFilters", "collation", "hint"])})`;
}

function deleteCall(command: UnknownRecord): string | undefined {
  const statement = firstStatement(command.deletes) ?? command;
  if (statement.q === undefined) return undefined;
  const options = statement.limit === 1 ? { justOne: true } : {};
  return `.remove(${literal(statement.q)}${Object.keys(options).length ? `, ${literal(options)}` : ""})`;
}

function firstStatement(statements: unknown): UnknownRecord | undefined {
  return Array.isArray(statements) && isRecord(statements[0])
    ? statements[0]
    : undefined;
}

function optionsArgument(
  source: UnknownRecord,
  keys: readonly string[],
): string {
  const options = pick(source, keys);
  return Object.keys(options).length ? `, ${literal(options)}` : "";
}

function pick(source: UnknownRecord, keys: readonly string[]): UnknownRecord {
  const out: UnknownRecord = {};
  for (const key of keys) if (source[key] !== undefined) out[key] = source[key];
  return out;
}

function literal(value: unknown): string {
  return shellLiteral(value);
}
