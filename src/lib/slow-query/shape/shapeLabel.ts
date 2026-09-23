import type { OperationKind } from "#types/slow-query";
import { isRecord, type UnknownRecord } from "../objects";

/**
 * Short human description of a command for table rows and shape labels:
 * pipeline stage names for aggregations, predicate keys for queries, the
 * command's own name for everything else.
 */
export function describeCommand(
  command: UnknownRecord,
  operation: OperationKind,
  commandName: string,
): string {
  if (Array.isArray(command.pipeline)) {
    const stages = command.pipeline.map(stageName).join(" → ");
    return stages || operation;
  }
  const predicate = command.filter ?? command.query ?? command.q;
  if (isRecord(predicate)) {
    const keys = Object.keys(predicate);
    return keys.length ? `${operation} { ${keys.join(", ")} }` : operation;
  }
  return commandName;
}

function stageName(stage: unknown): string {
  if (!isRecord(stage)) return "?";
  return Object.keys(stage)[0] ?? "?";
}
