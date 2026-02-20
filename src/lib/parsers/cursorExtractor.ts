import type {
  ExplainPlan,
  ExplainStage,
  WinningPlan,
} from "#types/explain-plan";

/**
 * Cursor content extracted from aggregation pipeline stages.
 *
 * MongoDB uses cursor-type stages (like $cursor, $geoNearCursor) as the first stage
 * in aggregation explain plans. These stages wrap the underlying query execution
 * and contain queryPlanner and/or executionStats data.
 *
 * This type represents the inner content of any cursor-type stage, regardless of
 * the specific cursor key name (e.g., $cursor, $geoNearCursor, future cursor types).
 */
export interface CursorContent {
  queryPlanner?: {
    namespace?: string;
    parsedQuery?: Record<string, unknown>;
    winningPlan?: WinningPlan & {
      queryPlan?: WinningPlan;
      slotBasedPlan?: { slots: string; stages: string };
    };
    rejectedPlans?: unknown[];
    [key: string]: unknown;
  };
  executionStats?: {
    executionSuccess?: boolean;
    nReturned?: number;
    executionTimeMillis?: number;
    totalKeysExamined?: number;
    totalDocsExamined?: number;
    executionStages?: ExplainStage;
    allPlansExecution?: unknown[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Result of cursor extraction, including the cursor key name for debugging/logging.
 */
export interface CursorExtractionResult {
  /** The cursor content (queryPlanner, executionStats, etc.) */
  content: CursorContent;
  /** The key name that contained the cursor (e.g., "$cursor", "$geoNearCursor") */
  cursorKey: string;
}

/**
 * Detects if an object contains cursor-like content.
 *
 * Cursor content is identified by the presence of:
 * - queryPlanner (with optional winningPlan)
 * - executionStats (with optional executionStages)
 *
 * This structure-based detection is future-proof: any new cursor type
 * MongoDB introduces will be automatically supported as long as it
 * follows the same internal structure.
 */
function isCursorLikeContent(value: unknown): value is CursorContent {
  if (value == null || typeof value !== "object") {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // A cursor must have queryPlanner or executionStats
  const hasQueryPlanner =
    "queryPlanner" in obj &&
    obj.queryPlanner != null &&
    typeof obj.queryPlanner === "object";

  const hasExecutionStats =
    "executionStats" in obj &&
    obj.executionStats != null &&
    typeof obj.executionStats === "object";

  return hasQueryPlanner || hasExecutionStats;
}

/**
 * Extracts cursor content from an aggregation stage object.
 *
 * This function uses structure-based detection rather than checking for specific
 * key names like "$cursor". This makes it future-proof for any cursor type
 * MongoDB might introduce (e.g., $geoNearCursor, or future cursor types).
 *
 * Detection logic:
 * 1. Look for keys starting with "$" (MongoDB operator convention)
 * 2. Check if the value contains cursor-like content (queryPlanner/executionStats)
 * 3. Return the first matching cursor content found
 *
 * @param stage - An aggregation stage object (e.g., plan.stages[0])
 * @returns The cursor content and key name, or null if no cursor found
 *
 * @example
 * // Works with standard $cursor
 * extractCursorContent({ $cursor: { queryPlanner: {...}, executionStats: {...} } })
 *
 * // Also works with $geoNearCursor
 * extractCursorContent({ $geoNearCursor: { queryPlanner: {...}, executionStats: {...} } })
 *
 * // Returns null for non-cursor stages
 * extractCursorContent({ $match: { status: "active" } }) // null
 */
export function extractCursorContent(
  stage: unknown,
): CursorExtractionResult | null {
  if (stage == null || typeof stage !== "object") {
    return null;
  }

  const stageObj = stage as Record<string, unknown>;

  // Look for cursor-type keys (MongoDB operators starting with $)
  // that contain cursor-like content (queryPlanner/executionStats)
  for (const key of Object.keys(stageObj)) {
    // Cursor keys follow MongoDB's operator convention (start with $)
    if (!key.startsWith("$")) {
      continue;
    }

    const value = stageObj[key];
    if (isCursorLikeContent(value)) {
      return {
        content: value,
        cursorKey: key,
      };
    }
  }

  return null;
}

/**
 * Extracts cursor content from the first stage of an explain plan's stages array.
 *
 * This is a convenience function for the common pattern of extracting cursor
 * data from plan.stages[0].
 *
 * @param plan - The explain plan object
 * @returns The cursor content and key name, or null if no cursor found
 *
 * @example
 * const result = extractCursorFromPlan(explainPlan);
 * if (result) {
 *   const { content, cursorKey } = result;
 *   console.log(`Found ${cursorKey} with ${content.executionStats?.nReturned} docs`);
 * }
 */
export function extractCursorFromPlan(
  plan: ExplainPlan,
): CursorExtractionResult | null {
  if (!plan.stages || !Array.isArray(plan.stages) || plan.stages.length === 0) {
    return null;
  }

  return extractCursorContent(plan.stages[0]);
}

/**
 * Checks if a stage is a cursor-type stage (has cursor content).
 *
 * @param stage - An aggregation stage object
 * @returns true if the stage contains cursor content
 */
export function isCursorStage(stage: unknown): boolean {
  return extractCursorContent(stage) !== null;
}

/**
 * Gets the cursor content directly (without the key name).
 *
 * This is useful when you only need the content and don't care about
 * which specific cursor type was used.
 *
 * @param stage - An aggregation stage object
 * @returns The cursor content, or null if no cursor found
 */
export function getCursorContent(stage: unknown): CursorContent | null {
  const result = extractCursorContent(stage);
  return result?.content ?? null;
}

/**
 * Gets cursor content from a plan's first stage.
 *
 * @param plan - The explain plan object
 * @returns The cursor content, or null if no cursor found
 */
export function getCursorContentFromPlan(
  plan: ExplainPlan,
): CursorContent | null {
  const result = extractCursorFromPlan(plan);
  return result?.content ?? null;
}
