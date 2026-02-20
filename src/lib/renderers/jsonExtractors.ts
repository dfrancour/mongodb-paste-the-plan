import type { ExplainPlan } from "#types/explain-plan";

/**
 * JSON extractor functions for each component type
 *
 * Each function extracts the specific JSON data that a component uses
 * from the raw MongoDB explain plan, providing transparency about
 * how the application processes explain plan data.
 */

/**
 * Extract JSON data used by PlanSelectionAnalysisComponent
 * Shows full paths: queryPlanner.* and executionStats.*
 */
export function extractPlanSelectionJSON(plan: ExplainPlan) {
  if (!plan) {
    return { error: "No explain plan provided" };
  }

  return {
    executionStats: {
      allPlansExecution: plan.executionStats?.allPlansExecution,
    },
  };
}

/**
 * Extract JSON data used by ESRAnalysisComponent
 * Shows the raw winningPlan data that ESR analysis processes
 */
export function extractESRAnalysisJSON(plan: ExplainPlan) {
  if (!plan) {
    return { error: "No explain plan provided" };
  }

  return {
    queryPlanner: {
      parsedQuery: plan.queryPlanner?.parsedQuery,
      winningPlan: plan.queryPlanner?.winningPlan,
    },
  };
}

/**
 * Extract JSON data used by ServerEnvironmentComponent
 * Shows full paths to server environment data
 */
export function extractServerEnvironmentJSON(plan: ExplainPlan) {
  if (!plan) {
    return { error: "No explain plan provided" };
  }

  return {
    // Full paths to server environment data
    serverInfo: plan.serverInfo,
    serverParameters: plan.serverParameters,
    explainVersion: plan.explainVersion,
  };
}

/**
 * Extract JSON data used by FlowVisualization
 * Shows full paths: queryPlanner.winningPlan.*, executionStats.*, stages, or shards for sharded plans
 */
export function extractFlowVisualizationJSON(plan: ExplainPlan) {
  if (!plan) {
    return { error: "No explain plan provided" };
  }

  // Use proper type assertion instead of 'any'
  const planData = plan as Record<string, unknown>;

  // Detect sharded plan types and extract relevant data
  const isModernShardedAggregation =
    planData.shards &&
    typeof planData.shards === "object" &&
    !planData.stages &&
    !planData.splitPipeline;
  const queryPlanner = planData.queryPlanner as
    | Record<string, unknown>
    | undefined;
  const executionStats = planData.executionStats as
    | Record<string, unknown>
    | undefined;
  const winningPlan = queryPlanner?.winningPlan as
    | Record<string, unknown>
    | undefined;
  const executionStages = executionStats?.executionStages as
    | Record<string, unknown>
    | undefined;
  const isShardedFind = winningPlan?.shards ?? executionStages?.shards;

  if (isModernShardedAggregation) {
    // Modern sharded aggregation - show shards data
    return {
      // Sharded aggregation structure
      shards: planData.shards,
      serverInfo: planData.serverInfo,
      command: planData.command,
      explainVersion: "sharded_aggregation",
      // Show split pipeline info if present
      splitPipeline: planData.splitPipeline,
    };
  } else if (isShardedFind) {
    // Sharded find query - show shard array and top-level structure
    const queryPlanner = planData.queryPlanner as Record<string, unknown>;
    const executionStats = planData.executionStats as Record<string, unknown>;

    return {
      // Full queryPlanner path showing sharded structure
      queryPlanner: {
        namespace: queryPlanner?.namespace,
        mongosPlannerVersion: queryPlanner?.mongosPlannerVersion,
        winningPlan: {
          stage: (queryPlanner?.winningPlan as Record<string, unknown>)?.stage, // SINGLE_SHARD or SHARD_MERGE
          shards: (queryPlanner?.winningPlan as Record<string, unknown>)
            ?.shards,
          queryPlan: (queryPlanner?.winningPlan as Record<string, unknown>)
            ?.queryPlan,
          slotBasedPlan: (queryPlanner?.winningPlan as Record<string, unknown>)
            ?.slotBasedPlan,
        },
      },
      // Full executionStats path showing sharded execution
      executionStats: {
        executionSuccess: executionStats?.executionSuccess,
        nReturned: executionStats?.nReturned,
        executionTimeMillis: executionStats?.executionTimeMillis,
        totalKeysExamined: executionStats?.totalKeysExamined,
        totalDocsExamined: executionStats?.totalDocsExamined,
        executionStages: {
          stage: (executionStats?.executionStages as Record<string, unknown>)
            ?.stage,
          shards: (executionStats?.executionStages as Record<string, unknown>)
            ?.shards,
        },
      },
      explainVersion: planData.explainVersion ?? "sharded_find",
    };
  } else {
    // Single-node plan (existing logic)
    const queryPlanner = planData.queryPlanner as Record<string, unknown>;
    const executionStats = planData.executionStats as Record<string, unknown>;

    return {
      // Full queryPlanner path for flow visualization
      queryPlanner: {
        namespace: queryPlanner?.namespace,
        winningPlan: {
          queryPlan: (queryPlanner?.winningPlan as Record<string, unknown>)
            ?.queryPlan,
          slotBasedPlan: (queryPlanner?.winningPlan as Record<string, unknown>)
            ?.slotBasedPlan,
        },
      },
      // Full executionStats path for metrics
      executionStats: {
        executionSuccess: executionStats?.executionSuccess,
        nReturned: executionStats?.nReturned,
        executionTimeMillis: executionStats?.executionTimeMillis,
        totalKeysExamined: executionStats?.totalKeysExamined,
        totalDocsExamined: executionStats?.totalDocsExamined,
        executionStages: executionStats?.executionStages,
      },
      // SBE stages at root level (explainVersion: "2")
      stages: planData.stages,
      explainVersion: planData.explainVersion,
    };
  }
}

/**
 * Extract JSON data used by MongoCommandDisplay
 */
export function extractMongoCommandJSON(plan: ExplainPlan) {
  if (!plan) {
    return { error: "No explain plan provided" };
  }

  return {
    command: plan.command,
  };
}

/**
 * Extract JSON data used by SlotInspector (SBE-specific)
 * Shows full paths: queryPlanner.winningPlan.slotBasedPlan, stages
 */
export function extractSlotInspectorJSON(plan: ExplainPlan) {
  if (!plan) {
    return { error: "No explain plan provided" };
  }

  return {
    // Full queryPlanner path to slot-based plan
    queryPlanner: {
      winningPlan: {
        slotBasedPlan: plan.queryPlanner?.winningPlan?.slotBasedPlan,
        queryPlan: plan.queryPlanner?.winningPlan?.queryPlan,
      },
    },
    // SBE stages at root level
    stages: plan.stages,
    explainVersion: plan.explainVersion,
  };
}

/**
 * Generic extractor that returns the full explain plan
 * Useful for components that need access to everything
 */
export function extractFullExplainPlan(plan: ExplainPlan) {
  return plan;
}

/**
 * Extract minimal JSON showing only what's actually used by a component
 * This can be customized per component to show exactly what data is consumed
 */
export function extractMinimalJSON(plan: ExplainPlan, fields: string[]) {
  const result: Record<string, unknown> = {};

  fields.forEach((field) => {
    const value = getNestedValue(plan, field);
    if (value !== undefined) {
      setNestedValue(result, field, value);
    }
  });

  return result;
}

// Helper function to get nested object values using dot notation
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce((current: unknown, key: string) => {
    if (typeof current === "object" && current !== null) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// Helper function to set nested object values using dot notation
function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const keys = path.split(".");
  const lastKey = keys.pop();
  if (!lastKey) return;

  const target = keys.reduce(
    (current: Record<string, unknown>, key: string) => {
      if (
        !(key in current) ||
        typeof current[key] !== "object" ||
        current[key] === null
      ) {
        current[key] = {};
      }
      return current[key] as Record<string, unknown>;
    },
    obj,
  );

  target[lastKey] = value;
}
