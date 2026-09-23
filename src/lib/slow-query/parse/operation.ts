import { OPERATION_KINDS, type OperationKind } from "#types/slow-query";
import type { UnknownRecord } from "../objects";

/** Legacy per-operation log types (component WRITE) whose command is `{ q, u, ... }`. */
const LEGACY_TYPES: Readonly<Record<string, OperationKind>> = {
  update: "update",
  remove: "delete",
  insert: "insert",
  query: "find",
  getmore: "getMore",
};

/**
 * Identify the operation from the command document, falling back to the
 * record's `type` for legacy write logs. Anything else is a non-query command.
 */
export function identifyOperation(
  command: UnknownRecord,
  attrType: string | undefined,
): OperationKind {
  const fromCommand = OPERATION_KINDS.find((op) => Object.hasOwn(command, op));
  if (fromCommand) return fromCommand;
  if (Object.hasOwn(command, "findandmodify")) return "findAndModify";
  const legacy = attrType === undefined ? undefined : LEGACY_TYPES[attrType];
  return legacy ?? "command";
}

/** The command's own name: its first key, or the operation for legacy logs without one. */
export function commandNameOf(
  command: UnknownRecord,
  operation: OperationKind,
): string {
  if (operation !== "command") return operation;
  return Object.keys(command)[0] ?? operation;
}
