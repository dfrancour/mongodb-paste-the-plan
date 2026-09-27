import { isRecord, mapObject } from "../objects";
import {
  canonicalExpression,
  canonicalOrdered,
  canonicalProjection,
} from "./expression";
import { canonicalPredicate } from "./predicate";

const EXPRESSION_STAGES = new Set([
  "$group",
  "$set",
  "$addFields",
  "$replaceRoot",
  "$replaceWith",
  "$sortByCount",
]);
const SUBPIPELINE_STAGES = new Set(["$lookup", "$unionWith"]);

/** Canonicalize an aggregation pipeline stage by stage. */
export function canonicalPipeline(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((stage) =>
    isRecord(stage) ? mapObject(stage, canonicalStageBody) : stage,
  );
}

function canonicalStageBody(body: unknown, stage: string): unknown {
  if (stage === "$match") return canonicalPredicate(body);
  if (stage === "$sort") return canonicalOrdered(body);
  if (stage === "$project") return canonicalProjection(body);
  if (EXPRESSION_STAGES.has(stage)) return canonicalExpression(body);
  if (stage === "$facet" && isRecord(body)) {
    return mapObject(body, canonicalPipeline, true);
  }
  if (SUBPIPELINE_STAGES.has(stage) && isRecord(body)) {
    return mapObject(
      body,
      (item, key) => {
        if (key === "pipeline") return canonicalPipeline(item);
        if (key === "let") return canonicalExpression(item);
        return item;
      },
      true,
    );
  }
  return body; // Limits, field names, and unsupported stages stay exact.
}
