import type { OperationKind, QueryShape } from "#types/slow-query";
import { isRecord, mapObject, type UnknownRecord } from "../objects";
import { NOISE_KEYS } from "../parse/noiseKeys";
import {
  canonicalExpression,
  canonicalOrdered,
  canonicalProjection,
} from "./expression";
import { canonicalPipeline } from "./pipeline";
import { canonicalPredicate } from "./predicate";
import { describeCommand } from "./shapeLabel";
import { typeToken } from "./typeToken";

export interface ShapeInput {
  /** The logical command (for cursor batches, the originating command). */
  readonly command: UnknownRecord;
  readonly operation: OperationKind;
  readonly commandName: string;
  readonly namespace: string;
  readonly entryId: number;
  /**
   * When true the entry gets a shape of its own. Used for truncated or
   * missing commands and for cursor batches without an originating command,
   * where merging would invent similarity.
   */
  readonly singleton: boolean;
}

/** Keys that vary per request without changing what the query asks for. */
const SKIPPED_KEYS = new Set([
  "findandmodify",
  "comment",
  "collection",
  "batchSize",
  "cursor",
  "maxTimeMS",
  "txnNumber",
  "autocommit",
  "startTransaction",
]);
const ORDERED_OPTIONS = new Set(["hint", "min", "max"]);

export function buildQueryShape(input: ShapeInput): QueryShape {
  const canonical = canonicalCommand(input);
  const summary = describeCommand(
    input.command,
    input.operation,
    input.commandName,
  );
  return {
    key: JSON.stringify(canonical),
    summary,
    canonical,
  };
}

function canonicalCommand(input: ShapeInput): UnknownRecord {
  const { command, operation, commandName, namespace } = input;
  if (operation === "command") {
    return {
      namespace,
      operation,
      commandName,
      ...(input.singleton ? { singletonEntry: input.entryId } : {}),
    };
  }
  const shape: UnknownRecord = { namespace, operation };
  const options: UnknownRecord = {};
  for (const key of Object.keys(command).sort()) {
    if (NOISE_KEYS.has(key) || SKIPPED_KEYS.has(key) || key === operation) {
      continue;
    }
    const value = command[key];
    const canonical = canonicalField(key, value);
    if (canonical === undefined) {
      options[key] = ORDERED_OPTIONS.has(key)
        ? canonicalOrdered(value)
        : typeToken(value);
    } else {
      shape[key] = canonical;
    }
  }
  if (Object.keys(options).length > 0) shape.options = options;
  if (input.singleton) shape.singletonEntry = input.entryId;
  return shape;
}

/**
 * Returns undefined for keys that are options rather than query intent;
 * their values become type tokens, so `limit: 10` and `limit: 20` share a shape.
 */
function canonicalField(key: string, value: unknown): unknown {
  switch (key) {
    case "filter":
    case "query":
    case "q":
      return canonicalPredicate(value);
    case "pipeline":
      return canonicalPipeline(value);
    case "sort":
      return canonicalOrdered(value);
    case "projection":
    case "fields":
      return canonicalProjection(value);
    case "u":
    case "update":
      return Array.isArray(value)
        ? canonicalPipeline(value)
        : canonicalExpression(value);
    case "updates":
    case "deletes":
      return Array.isArray(value) ? value.map(canonicalWriteStatement) : value;
    case "documents":
      return Array.isArray(value) ? `?documents[${value.length}]` : value;
    case "key":
      return value;
    default:
      return undefined;
  }
}

function canonicalWriteStatement(statement: unknown): unknown {
  if (!isRecord(statement)) return statement;
  return mapObject(
    statement,
    (item, key) => canonicalField(key, item) ?? item,
    true,
  );
}
