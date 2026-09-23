import { compareByJson, isRecord, mapObject } from "../objects";
import { canonicalExpression } from "./expression";
import { arrayToken, isEjsonTypeObject, typeToken } from "./typeToken";

const COMPARISON_OPERATORS = new Set([
  "$eq",
  "$ne",
  "$gt",
  "$gte",
  "$lt",
  "$lte",
  "$in",
  "$nin",
]);
const LOGICAL_OPERATORS = new Set(["$and", "$or", "$nor"]);

/** Canonicalize the right-hand side of one field in a query predicate. */
function canonicalCondition(value: unknown): unknown {
  if (!isRecord(value) || isEjsonTypeObject(value)) return typeToken(value);
  if (!Object.keys(value).some((key) => key.startsWith("$"))) {
    return typeToken(value);
  }
  return mapObject(
    value,
    (item, key) => {
      if (COMPARISON_OPERATORS.has(key)) {
        return Array.isArray(item) ? arrayToken(item) : typeToken(item);
      }
      if (key === "$elemMatch") return canonicalPredicate(item);
      if (key === "$not") return canonicalCondition(item);
      return item; // Regexes, flags, types, and unknown operators stay exact.
    },
    true,
  );
}

/** Canonicalize a query predicate (`filter`, `$match`, `q`). */
export function canonicalPredicate(value: unknown): unknown {
  if (!isRecord(value)) return typeToken(value);
  return mapObject(
    value,
    (item, key) => {
      if (LOGICAL_OPERATORS.has(key) && Array.isArray(item)) {
        return item.map(canonicalPredicate).sort(compareByJson);
      }
      if (key === "$expr") return canonicalExpression(item);
      if (key === "$text" && isRecord(item)) {
        return mapObject(item, (option) => typeToken(option), true);
      }
      return key.startsWith("$") ? item : canonicalCondition(item);
    },
    true,
  );
}
