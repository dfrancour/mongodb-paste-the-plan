/**
 * Plan selection analysis for allPlansExecution data.
 *
 * Analyzes winning vs rejected plans from MongoDB's multi-plan execution,
 * calculating efficiency metrics, detecting tie-breakers, and generating
 * recommendations.
 *
 * IMPORTANT: For apples-to-apples comparison, we use trial execution data
 * for ALL plans (including the winning plan). allPlansExecution[0] contains
 * the winning plan's trial metrics, and the rest are rejected plans.
 */
import type {
  ExplainPlan,
  PlanSelectionAnalysis,
  PlanComparison,
} from "#types/explain-plan";

/**
 * Type for execution statistics from plan comparison
 */
interface ExecutionStats {
  nReturned?: number;
  totalDocsExamined?: number;
  totalKeysExamined?: number;
  executionTimeMillis?: number;
  executionTimeMillisEstimate?: number;
  executionStages?: unknown;
  score?: number;
}

/**
 * Type for execution stage structure (recursive)
 */
interface ExecutionStageStructure {
  stage?: string;
  indexName?: string;
  inputStage?: ExecutionStageStructure;
  inputStages?: ExecutionStageStructure[];
}

export function analyzePlanSelection(
  plan: ExplainPlan,
): PlanSelectionAnalysis | null {
  if (
    !plan.executionStats?.allPlansExecution ||
    plan.executionStats.allPlansExecution.length === 0
  ) {
    return null;
  }

  const allPlans = plan.executionStats.allPlansExecution;
  const winningPlan = createPlanComparison(allPlans[0]!, "winning");
  const rejectedPlans = allPlans
    .slice(1)
    .map((rejectedPlan) => createPlanComparison(rejectedPlan, "rejected"));

  const recommendation = generatePlanRecommendation(winningPlan, rejectedPlans);
  const insights = generatePlanInsights(winningPlan, rejectedPlans);

  const optimizationTimeMillis = plan.queryPlanner?.optimizationTimeMillis;
  const plannerLimits = {
    maxIndexedOrSolutionsReached:
      plan.queryPlanner?.maxIndexedOrSolutionsReached,
    maxIndexedAndSolutionsReached:
      plan.queryPlanner?.maxIndexedAndSolutionsReached,
    maxScansToExplodeReached: plan.queryPlanner?.maxScansToExplodeReached,
  };

  const queryHashValue = plan.queryHash ?? plan.queryPlanner?.queryHash;
  const cacheInfo = {
    queryHash: typeof queryHashValue === "string" ? queryHashValue : undefined,
    planCacheKey: plan.queryPlanner?.planCacheKey,
    planCacheShapeHash: plan.queryPlanner?.planCacheShapeHash,
    isCached: plan.queryPlanner?.winningPlan?.isCached,
    queryShapeHash: plan.queryShapeHash,
  };

  const queryPlannerInfo = {
    indexFilterSet: plan.queryPlanner?.indexFilterSet,
    prunedSimilarIndexes: plan.queryPlanner?.prunedSimilarIndexes,
  };

  return {
    winningPlan,
    rejectedPlans,
    recommendation,
    insights,
    optimizationTimeMillis,
    plannerLimits,
    cacheInfo,
    queryPlannerInfo,
  };
}

// ============================================================================
// Internal helpers
// ============================================================================

function createPlanComparison(
  stats: ExecutionStats,
  planType: "winning" | "rejected",
): PlanComparison {
  const nReturned = stats.nReturned ?? 0;
  const totalDocsExamined = stats.totalDocsExamined ?? 0;
  const totalKeysExamined = stats.totalKeysExamined ?? 0;
  const executionTimeMillis =
    stats.executionTimeMillis ?? stats.executionTimeMillisEstimate ?? 0;

  const { works, advanced } = extractWorkMetrics(stats.executionStages);

  const documentEfficiency =
    totalDocsExamined > 0 ? nReturned / totalDocsExamined : 0;
  const keyEfficiency =
    totalKeysExamined > 0 ? nReturned / totalKeysExamined : 0;
  const timePerDoc = nReturned > 0 ? executionTimeMillis / nReturned : 0;
  const productivity = works > 0 ? advanced / works : 0;

  const indexName = extractIndexName(stats.executionStages);
  const stages = extractStageNames(stats.executionStages);
  const eofBonus = detectEofBonus(stats.executionStages);
  const tieBreakers = detectTieBreakers(stats.executionStages);

  return {
    planType,
    efficiency: { documentEfficiency, keyEfficiency, timePerDoc, productivity },
    metrics: {
      nReturned,
      totalKeysExamined,
      totalDocsExamined,
      works,
      advanced,
      executionTimeMillis,
    },
    indexName,
    stages,
    score: stats.score,
    eofBonus,
    tieBreakers,
  };
}

/**
 * Extract MongoDB work metrics from root stage only.
 * Metrics are already cumulative — do NOT sum recursively.
 */
function extractWorkMetrics(stage: unknown): {
  works: number;
  advanced: number;
} {
  if (!stage) return { works: 0, advanced: 0 };

  if (typeof stage === "object" && stage !== null) {
    const stageObj = stage as Record<string, unknown>;
    const works = typeof stageObj.works === "number" ? stageObj.works : 0;
    const advanced =
      typeof stageObj.advanced === "number" ? stageObj.advanced : 0;
    return { works, advanced };
  }

  return { works: 0, advanced: 0 };
}

function detectTieBreakers(stage: unknown): {
  noFetch: boolean;
  noSort: boolean;
  noIntersection: boolean;
} {
  if (!stage) return { noFetch: true, noSort: true, noIntersection: true };

  const stageNames = collectStageNames(stage);

  return {
    noFetch: !stageNames.includes("FETCH"),
    noSort: !stageNames.includes("SORT"),
    noIntersection:
      !stageNames.includes("AND_HASH") && !stageNames.includes("AND_SORTED"),
  };
}

function detectEofBonus(stage: unknown): boolean {
  if (!stage) return false;

  return (
    typeof stage === "object" &&
    stage !== null &&
    "isEOF" in stage &&
    stage.isEOF === 1
  );
}

function collectStageNames(stage: unknown): string[] {
  if (!stage) return [];

  const stages: string[] = [];

  if (typeof stage === "object" && stage !== null) {
    const stageObj = stage as Record<string, unknown>;
    if (typeof stageObj.stage === "string") {
      stages.push(stageObj.stage);
    }
  }

  if (typeof stage === "object" && stage !== null) {
    const stageObj = stage as Record<string, unknown>;

    if (stageObj.inputStage) {
      stages.push(...collectStageNames(stageObj.inputStage));
    }

    if (Array.isArray(stageObj.inputStages)) {
      for (const inputStage of stageObj.inputStages) {
        stages.push(...collectStageNames(inputStage));
      }
    }
  }

  return stages;
}

function isExecutionStageStructure(
  value: unknown,
): value is ExecutionStageStructure {
  return (
    typeof value === "object" &&
    value !== null &&
    "stage" in value &&
    typeof (value as Record<string, unknown>).stage === "string"
  );
}

function extractIndexName(stage: unknown): string | undefined {
  if (!isExecutionStageStructure(stage)) return undefined;

  if (stage.indexName) return stage.indexName;

  if (stage.inputStage) return extractIndexName(stage.inputStage);

  if (stage.inputStages && Array.isArray(stage.inputStages)) {
    for (const inputStage of stage.inputStages) {
      const indexName = extractIndexName(inputStage);
      if (indexName) return indexName;
    }
  }

  return undefined;
}

function extractStageNames(stage: unknown): string[] {
  if (!isExecutionStageStructure(stage)) return [];

  const stages: string[] = [];

  if (stage.stage) stages.push(stage.stage);

  if (stage.inputStage) {
    stages.push(...extractStageNames(stage.inputStage));
  }

  if (stage.inputStages && Array.isArray(stage.inputStages)) {
    for (const inputStage of stage.inputStages) {
      stages.push(...extractStageNames(inputStage));
    }
  }

  return stages;
}

function generatePlanRecommendation(
  winning: PlanComparison,
  rejected: PlanComparison[],
): string {
  if (rejected.length === 0) return "No alternative plans were considered.";

  const bestRejected = rejected.reduce((best, current) =>
    (current.efficiency.keyEfficiency ?? 0) >
    (best.efficiency.keyEfficiency ?? 0)
      ? current
      : best,
  );

  const winningEfficiency = winning.efficiency.keyEfficiency ?? 0;
  const rejectedEfficiency = bestRejected.efficiency.keyEfficiency ?? 0;

  if (winningEfficiency > rejectedEfficiency * 1.1) {
    return "MongoDB correctly chose the most efficient plan.";
  } else if (rejectedEfficiency > winningEfficiency * 1.1) {
    return "A rejected plan might have been more efficient. Consider analyzing index design.";
  } else {
    return "Plans have similar efficiency. MongoDB chose based on other factors.";
  }
}

function generatePlanInsights(
  winning: PlanComparison,
  rejected: PlanComparison[],
): string[] {
  const insights: string[] = [];

  if (rejected.length > 0) {
    const avgRejectedEfficiency =
      rejected.reduce(
        (sum, plan) => sum + (plan.efficiency.keyEfficiency ?? 0),
        0,
      ) / rejected.length;
    const winningEfficiency = winning.efficiency.keyEfficiency ?? 0;

    if (winningEfficiency > avgRejectedEfficiency * 2) {
      insights.push(
        "Winning plan is significantly more efficient than alternatives.",
      );
    } else if (avgRejectedEfficiency > winningEfficiency * 2) {
      insights.push(
        "Some rejected plans appear more efficient - investigate index design.",
      );
    }
  }

  if (winning.indexName) {
    insights.push(`Winning plan uses index: ${winning.indexName}`);
  } else {
    insights.push("Winning plan does not use an index (COLLSCAN)");
  }

  if (winning.stages && winning.stages.length > 3) {
    insights.push(
      "Winning plan has complex stage hierarchy - consider query optimization.",
    );
  }

  return insights;
}
