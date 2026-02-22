/**
 * Detect the MongoDB explain verbosity level used to generate this plan.
 * Returns: "queryPlanner" | "executionStats" | "allPlansExecution"
 */
import type { ExplainPlan } from "#types/explain-plan";
import { getCursorContentFromPlan } from "../cursorExtractor";

export function detectExplainMode(
  plan: ExplainPlan,
): "queryPlanner" | "executionStats" | "allPlansExecution" {
  // Check for allPlansExecution mode first (most detailed)
  if (
    plan.executionStats &&
    "allPlansExecution" in plan.executionStats &&
    Array.isArray(plan.executionStats.allPlansExecution)
  ) {
    return "allPlansExecution";
  }

  // Check for executionStats mode
  if (plan.executionStats) {
    return "executionStats";
  }

  // Check aggregation pipeline format (supports $cursor, $geoNearCursor, etc.)
  const cursorContent = getCursorContentFromPlan(plan);
  if (cursorContent) {
    const cursorStats = cursorContent.executionStats;
    if (
      cursorStats &&
      "allPlansExecution" in cursorStats &&
      Array.isArray(cursorStats.allPlansExecution)
    ) {
      return "allPlansExecution";
    }
    if (cursorStats) {
      return "executionStats";
    }
  }

  // Check sharded aggregation format
  if (plan.shards && typeof plan.shards === "object") {
    const shardNames = Object.keys(plan.shards);
    if (shardNames.length > 0) {
      const firstShard = (plan.shards as Record<string, unknown>)[
        shardNames[0]!
      ] as Record<string, unknown> | undefined;
      if (firstShard?.executionStats) {
        const shardExecStats = firstShard.executionStats as Record<
          string,
          unknown
        >;
        if (
          "allPlansExecution" in shardExecStats &&
          Array.isArray(shardExecStats.allPlansExecution)
        ) {
          return "allPlansExecution";
        }
        return "executionStats";
      }
    }
  }

  return "queryPlanner";
}
