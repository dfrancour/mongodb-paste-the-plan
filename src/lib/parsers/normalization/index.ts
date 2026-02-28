/**
 * Unified stage normalization.
 *
 * Converts raw MongoDB plan/execution stages into normalized trees.
 * A single recursive traversal handles both plan and execution modes,
 * extracting structure (always) and metrics (execution only).
 *
 * Child collection is generic — one implementation handles all
 * structural relationship types (inputStage, inputStages, SBE joins).
 * Shard expansion is handled separately since it produces execution nodes.
 */
import type {
  ExplainPlan,
  PlanStage,
  ExecutionStage,
  NormalizedPlanStage,
  NormalizedExecutionStage,
} from "#types/explain-plan";
import { getStringProperty } from "#lib/utils/jsxUtils";
import { getStage, StageCategory } from "#data/stages";
import { extractStructure } from "./structureExtractor";
import { extractMetrics, calculateEfficiency } from "./metricsExtractor";
import { expandShardsForPlan, expandShardsForExecution } from "./shardExpander";
import { PlanParseError } from "../errors";
import { resolveFormat } from "../formatResolvers";
import type { FormatResolution } from "../formatResolvers";
import { selectPrimaryShardFromRecord } from "../formatResolvers/shardSelection";

export { extractStructure } from "./structureExtractor";
export { extractMetrics, calculateEfficiency } from "./metricsExtractor";

// ============================================================================
// Public API
// ============================================================================

/** Normalize a query plan (structural data only, no metrics) */
export function normalizePlan(plan: ExplainPlan): NormalizedPlanStage {
  const { planRoot } = resolveFormat(plan);

  if (!planRoot) {
    throw new PlanParseError("No query plan found in explain plan");
  }

  return normalizePlanStage(planRoot, 0, "root");
}

/** Normalize execution stats (full metrics) */
export function normalizeExecution(
  plan: ExplainPlan,
): NormalizedExecutionStage {
  const { executionRoot } = resolveFormat(plan);

  if (!executionRoot) {
    throw new PlanParseError("No execution stages found in explain plan");
  }

  const normalized = normalizeExecutionStage(executionRoot, 0, "root");

  injectCumulativeTotals(normalized, plan);

  return normalized;
}

/**
 * Normalize from pre-resolved roots. Used by the pipeline to avoid
 * calling resolveFormat twice.
 */
export function normalizeFromResolution(
  resolution: FormatResolution,
  plan: ExplainPlan,
): {
  plan: NormalizedPlanStage;
  execution: NormalizedExecutionStage | null;
} {
  // Bare pipelines (e.g., $documents) may only have an execution root.
  // Synthesize a plan stage from the execution root when needed.
  const planRoot =
    resolution.planRoot ??
    (resolution.executionRoot as unknown as PlanStage | null);

  if (!planRoot) {
    throw new PlanParseError("No query plan found in explain plan");
  }

  const normalizedPlan = normalizePlanStage(planRoot, 0, "root");

  let normalizedExecution: NormalizedExecutionStage | null = null;
  if (resolution.executionRoot) {
    normalizedExecution = normalizeExecutionStage(
      resolution.executionRoot,
      0,
      "root",
    );
    injectCumulativeTotals(normalizedExecution, plan);
  }

  return { plan: normalizedPlan, execution: normalizedExecution };
}

// ============================================================================
// Generic child collection
// ============================================================================

/**
 * Collect children from a stage using all known relationship types.
 * Handles classic (inputStage/inputStages), SBE joins (outer/inner),
 * and SBE conditionals (then/else). Shard expansion is handled
 * separately in normalizeExecutionStage since it's execution-only.
 */
function collectChildren<TStage, TResult>(
  stage: TStage,
  depth: number,
  path: string,
  normalize: (s: TStage, d: number, p: string) => TResult,
): TResult[] {
  const children: TResult[] = [];
  const s = stage as Record<string, unknown>;

  // Classic: inputStage
  if (s.inputStage && typeof s.inputStage === "object") {
    children.push(normalize(s.inputStage as TStage, depth + 1, `${path}.0`));
  }

  // Classic: inputStages
  if (Array.isArray(s.inputStages)) {
    s.inputStages.forEach((child: unknown, index: number) => {
      children.push(normalize(child as TStage, depth + 1, `${path}.${index}`));
    });
  }

  // SBE join: outerStage, innerStage
  if (s.outerStage && typeof s.outerStage === "object") {
    children.push(
      normalize(s.outerStage as TStage, depth + 1, `${path}.outer`),
    );
  }
  if (s.innerStage && typeof s.innerStage === "object") {
    children.push(
      normalize(s.innerStage as TStage, depth + 1, `${path}.inner`),
    );
  }

  // SBE conditional: thenStage, elseStage
  if (s.thenStage && typeof s.thenStage === "object") {
    children.push(normalize(s.thenStage as TStage, depth + 1, `${path}.then`));
  }
  if (s.elseStage && typeof s.elseStage === "object") {
    children.push(normalize(s.elseStage as TStage, depth + 1, `${path}.else`));
  }

  return children;
}

// ============================================================================
// Plan stage normalization (structure only)
// ============================================================================

function normalizePlanStage(
  stage: PlanStage,
  depth: number,
  path: string,
): NormalizedPlanStage {
  const structure = extractStructure(stage);
  const children = collectChildren(stage, depth, path, normalizePlanStage);

  // Plan-level shard expansion: SHARD_MERGE/SINGLE_SHARD with shards[]
  if ("shards" in stage && Array.isArray(stage.shards)) {
    children.push(
      ...expandShardsForPlan(
        stage.shards as unknown[],
        depth,
        path,
        normalizePlanStage,
      ),
    );
  }

  const stageName = getStringProperty(stage, "stage") ?? "UNKNOWN";
  const definition =
    getStage("planning", stageName) ?? getStage("mongos", stageName);

  return {
    id: path,
    stage: stageName,
    category: definition?.category ?? StageCategory.Unknown,
    iconName: definition?.iconName ?? "CircleQuestionMark",
    definition,
    structure,
    children,
    depth,
  };
}

// ============================================================================
// Execution stage normalization (structure + metrics)
// ============================================================================

function normalizeExecutionStage(
  stage: ExecutionStage,
  depth: number,
  path: string,
): NormalizedExecutionStage {
  const structure = extractStructure(stage);
  const children = collectChildren(stage, depth, path, normalizeExecutionStage);

  // Shard expansion produces NormalizedExecutionStage[] (with metrics),
  // so it's handled here rather than in the generic collectChildren.
  // Note: plan stages CAN have shards (e.g., SHARD_MERGE in winningPlan),
  // but format resolvers currently extract from within the primary shard,
  // so normalizePlanStage never sees them.
  if ("shards" in stage && Array.isArray(stage.shards)) {
    children.push(
      ...expandShardsForExecution(
        stage.shards as unknown[],
        depth,
        path,
        normalizeExecutionStage,
      ),
    );
  }

  const stageName = getStringProperty(stage, "stage") ?? "UNKNOWN";
  const definition =
    getStage("execution", stageName) ?? getStage("mongos", stageName);
  const metrics = extractMetrics(stage, definition);
  const efficiency = calculateEfficiency(metrics);

  return {
    id: path,
    stage: stageName,
    category: definition?.category ?? StageCategory.Unknown,
    iconName: definition?.iconName ?? "CircleQuestionMark",
    definition,
    structure,
    metrics,
    children,
    depth,
    efficiency,
  };
}

// ============================================================================
// Post-processing
// ============================================================================

/**
 * Inject cumulative totals from executionStats into root stage metrics.
 * MongoDB provides pre-computed totals at the plan level.
 */
function injectCumulativeTotals(
  normalized: NormalizedExecutionStage,
  plan: ExplainPlan,
): void {
  // Try top-level executionStats first (standard format)
  if (plan.executionStats) {
    if (plan.executionStats.totalDocsExamined !== undefined) {
      normalized.metrics.docsExamined = plan.executionStats.totalDocsExamined;
    }
    if (plan.executionStats.totalKeysExamined !== undefined) {
      normalized.metrics.keysExamined = plan.executionStats.totalKeysExamined;
    }
    return;
  }

  // For modern sharded aggregation, get totals from primary shard
  if (plan.shards && !plan.stages && !plan.splitPipeline) {
    const primaryShard = selectPrimaryShardFromRecord(plan.shards);
    if (primaryShard?.executionStats) {
      const executionStats = primaryShard.executionStats as Record<
        string,
        unknown
      >;
      if (typeof executionStats.totalDocsExamined === "number") {
        normalized.metrics.docsExamined = executionStats.totalDocsExamined;
      }
      if (typeof executionStats.totalKeysExamined === "number") {
        normalized.metrics.keysExamined = executionStats.totalKeysExamined;
      }
    }
  }
}
