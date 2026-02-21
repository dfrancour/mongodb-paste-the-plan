import type {
  ExplainPlan,
  ExplainStage,
  ExecutionStage,
  PlanStage,
  WinningPlan,
  NormalizedStage,
  NormalizedPlanStage,
  NormalizedExecutionStage,
  PlanSelectionAnalysis,
  PlanComparison,
  ParsedSBEPlan,
  HybridSBEPlan,
  SBEStage,
  SlotLineage,
} from "#types/explain-plan";
import { explainPlanSchema } from "#types/explain-plan";
import {
  getNumericProperty,
  getStringProperty,
  isExecutionStage,
} from "#lib/utils/jsxUtils";
import { SBEParser } from "./sbeParser";
import { buildSlotLineages } from "#lib/analyzers";
import { getCursorContent, getCursorContentFromPlan } from "./cursorExtractor";
import { getStage, StageCategory } from "#data/stages";

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

export class PlanParseError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly errorType?: "invalid" | "parsing",
  ) {
    super(message);
    this.name = "PlanParseError";
  }
}

export class PlanParser {
  /**
   * Convert MongoDB Extended JSON format to plain JSON
   * Handles $numberInt, $numberLong, $numberDouble, $timestamp, etc.
   */
  static transformExtendedJSON(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.transformExtendedJSON(item));
    }

    if (typeof obj === "object") {
      const objRecord = obj as Record<string, unknown>;

      // Handle Extended JSON type objects
      if (Object.keys(objRecord).length === 1) {
        const key = Object.keys(objRecord)[0]!;
        const value = objRecord[key];

        switch (key) {
          case "$numberInt":
          case "$numberLong":
            return typeof value === "string" ? parseInt(value, 10) : value;
          case "$numberDouble":
            return typeof value === "string" ? parseFloat(value) : value;
          case "$timestamp":
            // Keep timestamp objects as-is for now
            return objRecord;
          case "$binary":
            // Keep binary objects as-is
            return objRecord;
          default:
            // Not an extended JSON type, continue processing
            break;
        }
      }

      // Recursively transform all properties
      const transformed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(objRecord)) {
        transformed[key] = this.transformExtendedJSON(value);
      }
      return transformed;
    }

    return obj;
  }

  /**
   * Type guard to check if unknown value looks like an execution stage
   */
  private static isExecutionStageStructure(
    value: unknown,
  ): value is ExecutionStageStructure {
    return isExecutionStage(value);
  }

  /**
   * Check if this is an SBE plan (explainVersion: "2")
   */
  static isSBEPlan(plan: ExplainPlan): boolean {
    return plan.explainVersion === "2";
  }

  /**
   * Extract SBE plan from explain plan (supports multiple formats)
   */
  static extractSBEPlan(plan: ExplainPlan): ParsedSBEPlan | null {
    if (!this.isSBEPlan(plan)) return null;

    // Method 1: SBE aggregation plans have stages array with cursor-type stages
    // Uses structure-based detection to support $cursor, $geoNearCursor, etc.
    const cursorContent = getCursorContentFromPlan(plan);
    if (cursorContent?.queryPlanner?.winningPlan?.slotBasedPlan) {
      const slotBasedPlan =
        cursorContent.queryPlanner.winningPlan.slotBasedPlan;
      const queryPlan = cursorContent.queryPlanner.winningPlan.queryPlan;
      const executionStages = cursorContent.executionStats?.executionStages;
      return SBEParser.parseSBEPlan(slotBasedPlan, queryPlan, executionStages);
    }

    // Method 2: Regular SBE plans have slotBasedPlan in queryPlanner.winningPlan
    if (plan.queryPlanner?.winningPlan?.slotBasedPlan) {
      const slotBasedPlan = plan.queryPlanner.winningPlan.slotBasedPlan;
      const queryPlan = plan.queryPlanner.winningPlan.queryPlan;
      const executionStages = plan.executionStats?.executionStages;
      return SBEParser.parseSBEPlan(slotBasedPlan, queryPlan, executionStages);
    }

    return null;
  }

  /**
   * Extract hybrid SBE plan that combines query plan hierarchy with SBE implementation
   */
  static extractHybridSBEPlan(plan: ExplainPlan): HybridSBEPlan | null {
    if (!this.isSBEPlan(plan)) return null;

    // Method 1: SBE aggregation plans have stages array with cursor-type stages
    // Uses structure-based detection to support $cursor, $geoNearCursor, etc.
    const cursorContent = getCursorContentFromPlan(plan);
    if (
      cursorContent?.queryPlanner?.winningPlan?.slotBasedPlan &&
      cursorContent?.queryPlanner?.winningPlan?.queryPlan
    ) {
      const queryPlan = cursorContent.queryPlanner.winningPlan.queryPlan;
      const slotBasedPlan =
        cursorContent.queryPlanner.winningPlan.slotBasedPlan;
      return this.parseHybridSBEPlan(queryPlan, slotBasedPlan);
    }

    // Method 2: Regular SBE plans have both queryPlan and slotBasedPlan in queryPlanner.winningPlan
    if (
      plan.queryPlanner?.winningPlan?.slotBasedPlan &&
      plan.queryPlanner?.winningPlan?.queryPlan
    ) {
      const queryPlan = plan.queryPlanner.winningPlan.queryPlan;
      const slotBasedPlan = plan.queryPlanner.winningPlan.slotBasedPlan;
      return this.parseHybridSBEPlan(queryPlan, slotBasedPlan);
    }

    return null;
  }

  /**
   * Parse hybrid SBE plan combining query plan hierarchy with SBE implementation
   */
  private static parseHybridSBEPlan(
    queryPlan: WinningPlan,
    slotBasedPlan: { slots: string; stages: string },
  ): HybridSBEPlan {
    // Parse SBE components
    const sbeStages = SBEParser.parseStages(slotBasedPlan.stages);
    const slotEnvironment = SBEParser.parseSlotEnvironment(slotBasedPlan.slots);
    const slotLineages = buildSlotLineages(sbeStages, slotEnvironment);

    // Flatten query plan to get all stages with planNodeIds
    const queryStages = this.flattenQueryPlanStages(queryPlan);

    // Group SBE stages by planNodeId
    const sbeGroups = this.groupSBEStagesByNodeId(sbeStages);

    // Create hybrid stages
    const hybridStages = queryStages.map((queryStage, index) => ({
      queryPlanStage: {
        stage: queryStage.stage ?? "UNKNOWN",
        planNodeId: queryStage.planNodeId ?? index + 1,
        indexName: this.getStringMetric(queryStage, "indexName"),
        filter: "filter" in queryStage ? queryStage.filter : undefined,
        keyPattern:
          "keyPattern" in queryStage ? queryStage.keyPattern : undefined,
        direction: this.getStringMetric(queryStage, "direction"),
        indexBounds:
          "indexBounds" in queryStage ? queryStage.indexBounds : undefined,
        sort: "sort" in queryStage ? queryStage.sort : undefined,
        limit: this.getMetric(queryStage, "limit"),
        projection:
          "projection" in queryStage ? queryStage.projection : undefined,
      },
      sbeImplementation: {
        stages: sbeGroups.get(queryStage.planNodeId ?? index + 1) ?? [],
        primarySlotFlow: this.calculateSlotFlow(
          sbeGroups.get(queryStage.planNodeId ?? index + 1) ?? [],
          slotLineages,
        ),
      },
      position: {
        level: queryStages.length - 1 - index, // Bottom-to-top: data sources at level 0
        order: 0,
      },
      metrics: {
        nReturned: this.getMetric(queryStage, "nReturned"),
        keysExamined: this.getMetric(queryStage, "keysExamined"),
        docsExamined: this.getMetric(queryStage, "docsExamined"),
        executionTimeMillis: this.getMetric(queryStage, "executionTimeMillis"),
      },
    }));

    return {
      explainVersion: "2",
      hybridStages,
      slotEnvironment,
      slotLineages,
      originalQueryPlan: queryPlan,
      originalSlotBasedPlan: slotBasedPlan,
    };
  }

  /**
   * Flatten query plan stages to get all stages with planNodeIds
   */
  private static flattenQueryPlanStages(
    plan: WinningPlan,
  ): (WinningPlan & { planNodeId?: number })[] {
    const stages: (WinningPlan & { planNodeId?: number })[] = [];

    function traverse(stage: WinningPlan, nodeIdCounter: { value: number }) {
      const stageWithNodeId = { ...stage, planNodeId: nodeIdCounter.value++ };
      stages.push(stageWithNodeId);

      if (stage.inputStage) {
        traverse(stage.inputStage, nodeIdCounter);
      }

      if (stage.inputStages) {
        for (const inputStage of stage.inputStages) {
          traverse(inputStage, nodeIdCounter);
        }
      }
    }

    traverse(plan, { value: 1 });
    return stages;
  }

  /**
   * Group SBE stages by their planNodeId
   */
  private static groupSBEStagesByNodeId(
    sbeStages: SBEStage[],
  ): Map<number, SBEStage[]> {
    const groups = new Map<number, SBEStage[]>();

    for (const stage of sbeStages) {
      const nodeId = stage.nodeId;
      const group = groups.get(nodeId) ?? [];
      group.push(stage);
      groups.set(nodeId, group);
    }

    return groups;
  }

  /**
   * Calculate primary slot flow for a group of SBE stages
   */
  private static calculateSlotFlow(
    sbeStages: SBEStage[],
    slotLineages: SlotLineage[],
  ): { input: string[]; output: string[]; internal: string[] } {
    if (sbeStages.length === 0) {
      return { input: [], output: [], internal: [] };
    }

    // Find all slots referenced by this stage group
    const allSlots = new Set<string>();
    for (const stage of sbeStages) {
      for (const slotId of stage.slotReferences) {
        allSlots.add(slotId);
      }
    }

    // Categorize slots based on their lineage
    const input: string[] = [];
    const output: string[] = [];
    const internal: string[] = [];

    for (const slotId of allSlots) {
      const lineage = slotLineages.find((l) => l.slotId === slotId);
      if (!lineage) continue;

      const createdByThisGroup = sbeStages.some((stage) =>
        lineage.definition.createdAt.includes(
          `${stage.stageType}_${stage.nodeId}`,
        ),
      );

      const usedByOtherGroups = lineage.usages.some(
        (usage) =>
          !sbeStages.some((stage) =>
            usage.usedAt.includes(`${stage.stageType}_${stage.nodeId}`),
          ),
      );

      if (createdByThisGroup && usedByOtherGroups) {
        output.push(slotId);
      } else if (
        !createdByThisGroup &&
        sbeStages.some((stage) =>
          lineage.usages.some((usage) =>
            usage.usedAt.includes(`${stage.stageType}_${stage.nodeId}`),
          ),
        )
      ) {
        input.push(slotId);
      } else {
        internal.push(slotId);
      }
    }

    return { input, output, internal };
  }

  /**
   * Parse and validate a MongoDB explain plan
   */
  static parse(rawPlan: unknown): ExplainPlan {
    try {
      // Transform Extended JSON format to plain JSON before validation
      const transformedPlan = this.transformExtendedJSON(rawPlan);
      return explainPlanSchema.parse(transformedPlan);
    } catch (error) {
      // Enhanced error reporting for development
      let errorMessage = "Invalid MongoDB explain plan format";

      // Handle different error types
      if (error && typeof error === "object") {
        if ("issues" in error) {
          // Zod validation error
          const zodError = error as {
            issues: Array<{ path: string[]; message: string }>;
          };
          const issueDetails = zodError.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; ");
          errorMessage += `: ${issueDetails}`;
        } else if ("message" in error) {
          // Standard Error object
          errorMessage += `: ${(error as Error).message}`;
        }
      }

      // Log detailed debugging information
      console.error("Plan parsing failed:", {
        error: error ?? "No error object",
        errorType: typeof error,
        errorKeys: error && typeof error === "object" ? Object.keys(error) : [],
        planType: typeof rawPlan,
        planKeys:
          rawPlan && typeof rawPlan === "object" ? Object.keys(rawPlan) : [],
        planPreview:
          rawPlan && typeof rawPlan === "object"
            ? Object.entries(rawPlan as Record<string, unknown>)
                .slice(0, 3)
                .map(([k, v]) => `${k}: ${typeof v}`)
                .join(", ")
            : "not an object",
      });

      // Try fallback parsing for basic plan structure
      if (rawPlan && typeof rawPlan === "object") {
        const plan = rawPlan as Record<string, unknown>;

        // Create a minimal valid plan structure with proper type assertions
        const fallbackPlan = {
          explainVersion:
            typeof plan.explainVersion === "string"
              ? plan.explainVersion
              : undefined,
          queryPlanner:
            plan.queryPlanner && typeof plan.queryPlanner === "object"
              ? (plan.queryPlanner as Record<string, unknown>)
              : undefined,
          executionStats:
            plan.executionStats && typeof plan.executionStats === "object"
              ? (plan.executionStats as Record<string, unknown>)
              : undefined,
          command:
            plan.command && typeof plan.command === "object"
              ? (plan.command as Record<string, unknown>)
              : undefined,
          serverInfo:
            plan.serverInfo && typeof plan.serverInfo === "object"
              ? (plan.serverInfo as Record<string, unknown>)
              : undefined,
          serverParameters:
            plan.serverParameters && typeof plan.serverParameters === "object"
              ? (plan.serverParameters as Record<string, unknown>)
              : undefined,
          stage: typeof plan.stage === "string" ? plan.stage : undefined,
          inputStage:
            plan.inputStage && typeof plan.inputStage === "object"
              ? (plan.inputStage as Record<string, unknown>)
              : undefined,
          inputStages: Array.isArray(plan.inputStages)
            ? (plan.inputStages as Record<string, unknown>[])
            : undefined,
        } as ExplainPlan;

        console.warn(
          "Using fallback plan parsing due to schema validation failure",
        );
        return fallbackPlan;
      }

      throw new PlanParseError(errorMessage, error);
    }
  }

  /**
   * Detect whether this plan contains execution data or just plan structure
   */
  static detectPlanMode(plan: ExplainPlan): "plan" | "execution" {
    // Check if executionStats.executionStages exists (execution mode)
    if (plan.executionStats?.executionStages) {
      return "execution";
    }

    // Check aggregation pipeline format (supports $cursor, $geoNearCursor, etc.)
    const cursorContent = getCursorContentFromPlan(plan);
    if (cursorContent) {
      // Check for execution mode
      if (cursorContent.executionStats?.executionStages) {
        return "execution";
      }
      // Check for plan mode
      if (cursorContent.queryPlanner?.winningPlan) {
        return "plan";
      }
      // Neither execution nor plan data found in aggregation cursor
      // Fall through to other checks
    }

    // Check direct stage format (has execution metrics)
    if (plan.stage && this.isExecutionStageStructure(plan)) {
      const planRecord = plan as Record<string, unknown>;
      // If it has execution metrics, it's execution mode
      if (
        "nReturned" in planRecord ||
        "docsExamined" in planRecord ||
        "executionTimeMillis" in planRecord
      ) {
        return "execution";
      }
    }

    // Check sharded find queries
    if (plan.executionStats?.executionStages?.shards) {
      return "execution";
    }

    // Check sharded aggregation formats (MongoDB 6.0+, MongoDB 8.0+ with Atlas Search)
    // Format: { shards: { "shard-name": { queryPlanner: {...}, executionStats: {...} } } }
    // Or: { shards: { "shard-name": { stages: [...] } } }
    if (
      plan.shards &&
      typeof plan.shards === "object" &&
      !Array.isArray(plan.shards)
    ) {
      const shardEntries = Object.entries(plan.shards);
      if (shardEntries.length > 0) {
        const [, shardData] = shardEntries[0]!;
        if (shardData && typeof shardData === "object") {
          const shard = shardData as Record<string, unknown>;

          // Check if shard has stages array (sharded aggregation pipeline format)
          if ("stages" in shard && Array.isArray(shard.stages)) {
            // If stages have execution metrics, it's execution mode
            const stages = shard.stages as Array<Record<string, unknown>>;
            if (stages.length > 0) {
              const firstStage = stages[0];
              // Check if any stage has execution metrics
              if (
                firstStage &&
                ("nReturned" in firstStage ||
                  "executionTimeMillis" in firstStage ||
                  "executionTimeMillisEstimate" in firstStage)
              ) {
                return "execution";
              }
            }
            // Otherwise, default to plan mode for stages arrays
            return "plan";
          }

          // Check if shard has execution stats
          if (
            shard.executionStats &&
            typeof shard.executionStats === "object"
          ) {
            const execStats = shard.executionStats as Record<string, unknown>;
            if ("executionStages" in execStats) {
              return "execution";
            }
          }
          // Check if shard has query planner
          if (shard.queryPlanner && typeof shard.queryPlanner === "object") {
            const queryPlanner = shard.queryPlanner as Record<string, unknown>;
            if ("winningPlan" in queryPlanner) {
              return "plan";
            }
          }
        }
      }
    }

    // Validate that queryPlanner exists before defaulting to 'plan' mode
    if (plan.queryPlanner?.winningPlan) {
      return "plan";
    }

    // If we reach here, the plan format is unrecognized
    throw new PlanParseError(
      "Cannot determine plan mode: missing both executionStats.executionStages and queryPlanner.winningPlan",
      undefined,
      "invalid",
    );
  }

  /**
   * Detect the MongoDB explain mode used to generate this plan
   * Returns the actual explain mode: "queryPlanner" | "executionStats" | "allPlansExecution"
   */
  static detectExplainMode(
    plan: ExplainPlan,
  ): "queryPlanner" | "executionStats" | "allPlansExecution" {
    // Check for allPlansExecution mode first (most detailed)
    // This mode includes executionStats.allPlansExecution field (even if empty array)
    if (
      plan.executionStats &&
      "allPlansExecution" in plan.executionStats &&
      Array.isArray(plan.executionStats.allPlansExecution)
    ) {
      return "allPlansExecution";
    }

    // Check for executionStats mode
    // This mode has executionStats but no allPlansExecution
    if (plan.executionStats) {
      return "executionStats";
    }

    // Check aggregation pipeline format (supports $cursor, $geoNearCursor, etc.)
    const cursorContent = getCursorContentFromPlan(plan);
    if (cursorContent) {
      const cursorStats = cursorContent.executionStats;
      // Check for allPlansExecution in cursor stats
      if (
        cursorStats &&
        "allPlansExecution" in cursorStats &&
        Array.isArray(cursorStats.allPlansExecution)
      ) {
        return "allPlansExecution";
      }
      // Check for executionStats in cursor
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
          // Check for allPlansExecution in shard
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

    // Default to queryPlanner mode (only plan structure, no execution data)
    return "queryPlanner";
  }

  /**
   * Normalize a query plan (queryPlanner.winningPlan) - structural data only, no metrics
   */
  static normalizePlan(plan: ExplainPlan): NormalizedPlanStage {
    const rootStage = this.findPlanStage(plan);

    if (!rootStage) {
      throw new PlanParseError("No query plan found in explain plan");
    }

    return this.normalizePlanStageRecursive(rootStage, 0, "root");
  }

  /**
   * Normalize execution stats (executionStats.executionStages) - full metrics
   */
  static normalizeExecution(plan: ExplainPlan): NormalizedExecutionStage {
    const rootStage = this.findExecutionStage(plan);

    if (!rootStage) {
      throw new PlanParseError("No execution stages found in explain plan");
    }

    const normalized = this.normalizeExecutionStageRecursive(
      rootStage,
      0,
      "root",
    );

    // Inject cumulative totals from executionStats into root stage metrics
    // Try top-level executionStats first (standard format)
    if (plan.executionStats) {
      if (plan.executionStats.totalDocsExamined !== undefined) {
        normalized.metrics.docsExamined = plan.executionStats.totalDocsExamined;
      }
      if (plan.executionStats.totalKeysExamined !== undefined) {
        normalized.metrics.keysExamined = plan.executionStats.totalKeysExamined;
      }
    }
    // For modern sharded aggregation, get totals from primary shard
    else if (plan.shards && !plan.stages && !plan.splitPipeline) {
      const primaryShard = this.selectPrimaryShardFromRecord(plan.shards);
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

    return normalized;
  }

  /**
   * Find plan stage from queryPlanner.winningPlan
   */
  private static findPlanStage(plan: ExplainPlan): PlanStage | null {
    // Format 1: Aggregation pipeline - cursor stage with queryPlanner.winningPlan
    // Supports $cursor, $geoNearCursor, and other cursor-type stages
    const cursorContent = getCursorContentFromPlan(plan);
    if (cursorContent) {
      const winningPlan = cursorContent.queryPlanner?.winningPlan;
      if (winningPlan && "queryPlan" in winningPlan) {
        return winningPlan.queryPlan as PlanStage;
      }
      if (winningPlan) {
        return winningPlan as PlanStage;
      }
    }

    // Format 2: queryPlanner.winningPlan (standard format)
    if (plan.queryPlanner?.winningPlan) {
      // Handle queryPlan wrapper
      const winningPlan = plan.queryPlanner.winningPlan;
      if ("queryPlan" in winningPlan && winningPlan.queryPlan) {
        return winningPlan.queryPlan;
      }
      return plan.queryPlanner.winningPlan;
    }

    // Format 3: Sharded find queries
    if (plan.queryPlanner?.winningPlan?.shards) {
      const primaryShard = this.selectPrimaryShard(
        plan.queryPlanner.winningPlan.shards,
      );
      if (
        primaryShard &&
        typeof primaryShard === "object" &&
        "winningPlan" in primaryShard
      ) {
        return primaryShard.winningPlan as PlanStage;
      }
    }

    // Format 4: Modern sharded aggregation (MongoDB 6.0+)
    if (
      plan.shards &&
      typeof plan.shards === "object" &&
      !Array.isArray(plan.shards)
    ) {
      const primaryShard = this.selectPrimaryShardFromRecord(plan.shards);
      if (!primaryShard) {
        return null;
      }

      // Format 4A: Sharded aggregation pipeline (stages array format)
      if ("stages" in primaryShard && Array.isArray(primaryShard.stages)) {
        const stages = primaryShard.stages as Array<Record<string, unknown>>;
        if (stages.length > 0) {
          const firstStage = stages[0];
          // Look for cursor-type stage (supports $cursor, $geoNearCursor, etc.)
          const shardCursorContent = getCursorContent(firstStage);
          if (shardCursorContent?.queryPlanner?.winningPlan) {
            return shardCursorContent.queryPlanner.winningPlan as PlanStage;
          }
          // Fallback: return first stage as plan stage
          return firstStage as PlanStage;
        }
      }

      // Format 4B: Sharded aggregation with queryPlanner.winningPlan
      if (primaryShard.queryPlanner) {
        const queryPlanner = primaryShard.queryPlanner as Record<
          string,
          unknown
        >;
        if ("winningPlan" in queryPlanner && queryPlanner.winningPlan) {
          const winningPlan = queryPlanner.winningPlan as Record<
            string,
            unknown
          >;
          // Handle queryPlan wrapper (SBE format)
          if ("queryPlan" in winningPlan && winningPlan.queryPlan) {
            return winningPlan.queryPlan as PlanStage;
          }
          return queryPlanner.winningPlan as PlanStage;
        }
      }
    }

    return null;
  }

  /**
   * Find execution stage from executionStats.executionStages
   */
  private static findExecutionStage(plan: ExplainPlan): ExecutionStage | null {
    // Format 1: executionStats.executionStages (standard format)
    if (plan.executionStats?.executionStages) {
      return plan.executionStats.executionStages;
    }

    // Format 2: Aggregation pipeline - cursor stage with executionStats.executionStages
    // Supports $cursor, $geoNearCursor, and other cursor-type stages
    const cursorContent = getCursorContentFromPlan(plan);
    if (cursorContent?.executionStats?.executionStages) {
      return cursorContent.executionStats.executionStages;
    }

    // Format 3: Direct stage format (has execution metrics)
    if (plan.stage && this.isExecutionStageStructure(plan)) {
      return plan as unknown as ExecutionStage;
    }

    // Format 4: Sharded find queries
    if (plan.executionStats?.executionStages?.shards) {
      const result = this.extractFromShardedFind(
        plan.executionStats.executionStages.shards,
      );
      if (result) {
        return result;
      }
    }

    // Format 5: Modern sharded aggregation (MongoDB 6.0+, MongoDB 8.0+ with Atlas Search)
    if (
      plan.shards &&
      typeof plan.shards === "object" &&
      !Array.isArray(plan.shards)
    ) {
      const primaryShard = this.selectPrimaryShardFromRecord(plan.shards);
      if (!primaryShard) {
        return null;
      }

      // Format 5A: Sharded aggregation pipeline (stages array format)
      if ("stages" in primaryShard && Array.isArray(primaryShard.stages)) {
        const stages = primaryShard.stages as Array<Record<string, unknown>>;
        if (stages.length > 0) {
          const firstStage = stages[0];
          // Look for cursor-type stage with execution stats
          // Supports $cursor, $geoNearCursor, and other cursor-type stages
          const shardCursorContent = getCursorContent(firstStage);
          if (shardCursorContent?.executionStats?.executionStages) {
            return shardCursorContent.executionStats.executionStages;
          }
          // Check if any stage has execution metrics
          for (const stage of stages) {
            if (this.isExecutionStageStructure(stage)) {
              return stage as ExecutionStage;
            }
          }
        }
      }

      // Format 5B: Sharded aggregation with executionStats.executionStages
      if (primaryShard.executionStats) {
        const executionStats = primaryShard.executionStats as Record<
          string,
          unknown
        >;
        if (
          "executionStages" in executionStats &&
          executionStats.executionStages
        ) {
          return executionStats.executionStages as ExecutionStage;
        }
      }
    }

    return null;
  }

  /**
   * Recursively normalize a plan stage (structure only)
   */
  private static normalizePlanStageRecursive(
    stage: PlanStage,
    depth: number,
    path: string,
  ): NormalizedPlanStage {
    const structure = {
      indexName: this.getStringMetric(stage, "indexName"),
      direction: this.getStringMetric(stage, "direction"),
      filter: "filter" in stage ? stage.filter : undefined,
      indexBounds: "indexBounds" in stage ? stage.indexBounds : undefined,
      keyPattern: "keyPattern" in stage ? stage.keyPattern : undefined,
      sortPattern: "sortPattern" in stage ? stage.sortPattern : undefined,
      limitAmount: this.getMetric(stage, "limitAmount"),
      sort: "sort" in stage ? stage.sort : undefined,
      limit: "limit" in stage ? stage.limit : undefined,
      skip: "skip" in stage ? stage.skip : undefined,
      projection: "projection" in stage ? stage.projection : undefined,
    };

    // Process children - handle both classic and SBE stage relationships
    const children: NormalizedPlanStage[] = [];

    // Classic stages: inputStage, inputStages
    if (stage.inputStage) {
      children.push(
        this.normalizePlanStageRecursive(
          stage.inputStage,
          depth + 1,
          `${path}.0`,
        ),
      );
    }

    if (stage.inputStages) {
      stage.inputStages.forEach((child, index) => {
        children.push(
          this.normalizePlanStageRecursive(
            child,
            depth + 1,
            `${path}.${index}`,
          ),
        );
      });
    }

    // SBE stages: outerStage, innerStage (for nlj, hash_lookup, etc.)
    if ("outerStage" in stage && stage.outerStage) {
      children.push(
        this.normalizePlanStageRecursive(
          stage.outerStage as PlanStage,
          depth + 1,
          `${path}.outer`,
        ),
      );
    }

    if ("innerStage" in stage && stage.innerStage) {
      children.push(
        this.normalizePlanStageRecursive(
          stage.innerStage as PlanStage,
          depth + 1,
          `${path}.inner`,
        ),
      );
    }

    // SBE conditional stages: thenStage, elseStage (for branch, etc.)
    if ("thenStage" in stage && stage.thenStage) {
      children.push(
        this.normalizePlanStageRecursive(
          stage.thenStage as PlanStage,
          depth + 1,
          `${path}.then`,
        ),
      );
    }

    if ("elseStage" in stage && stage.elseStage) {
      children.push(
        this.normalizePlanStageRecursive(
          stage.elseStage as PlanStage,
          depth + 1,
          `${path}.else`,
        ),
      );
    }

    const stageName = this.getStringMetric(stage, "stage") ?? "UNKNOWN";
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

  /**
   * Recursively normalize an execution stage (with metrics)
   */
  private static normalizeExecutionStageRecursive(
    stage: ExecutionStage,
    depth: number,
    path: string,
  ): NormalizedExecutionStage {
    const structure = {
      indexName: this.getStringMetric(stage, "indexName"),
      direction: this.getStringMetric(stage, "direction"),
      filter: "filter" in stage ? stage.filter : undefined,
      indexBounds: "indexBounds" in stage ? stage.indexBounds : undefined,
      keyPattern: "keyPattern" in stage ? stage.keyPattern : undefined,
      sortPattern: "sortPattern" in stage ? stage.sortPattern : undefined,
      limitAmount: this.getMetric(stage, "limitAmount"),
      sort: "sort" in stage ? stage.sort : undefined,
      limit:
        "limit" in stage
          ? ((stage as Record<string, unknown>).limit as number | undefined)
          : undefined,
      skip:
        "skip" in stage
          ? ((stage as Record<string, unknown>).skip as number | undefined)
          : undefined,
      projection: "projection" in stage ? stage.projection : undefined,
    };

    const metrics = {
      nReturned: this.getMetric(stage, "nReturned"),
      docsExamined:
        this.getMetric(stage, "docsExamined") ??
        this.getMetric(stage, "totalDocsExamined"),
      keysExamined:
        this.getMetric(stage, "keysExamined") ??
        this.getMetric(stage, "totalKeysExamined"),
      executionTimeMillis:
        this.getMetric(stage, "executionTimeMillis") ??
        this.getMetric(stage, "executionTimeMillisEstimate"),
      works: this.getMetric(stage, "works"),
      advanced: this.getMetric(stage, "advanced"),
      needTime: this.getMetric(stage, "needTime"),
      needYield: this.getMetric(stage, "needYield"),
      saveState: this.getMetric(stage, "saveState"),
      restoreState: this.getMetric(stage, "restoreState"),
      memLimit: this.getMetric(stage, "memLimit"),
      totalDataSizeSorted: this.getMetric(stage, "totalDataSizeSorted"),
      totalDataSizeSortedBytesEstimate: this.getMetric(
        stage,
        "totalDataSizeSortedBytesEstimate",
      ),
      usedDisk: "usedDisk" in stage ? stage.usedDisk : undefined,
      seeks: this.getMetric(stage, "seeks"),
      dupsTested: this.getMetric(stage, "dupsTested"),
      dupsDropped: this.getMetric(stage, "dupsDropped"),
      alreadyHasObj: this.getMetric(stage, "alreadyHasObj"),
    };

    // Process children - handle both classic and SBE stage relationships
    const children: NormalizedExecutionStage[] = [];

    // Classic stages: inputStage, inputStages
    if (stage.inputStage) {
      children.push(
        this.normalizeExecutionStageRecursive(
          stage.inputStage,
          depth + 1,
          `${path}.0`,
        ),
      );
    }

    if (stage.inputStages) {
      stage.inputStages.forEach((child, index) => {
        children.push(
          this.normalizeExecutionStageRecursive(
            child,
            depth + 1,
            `${path}.${index}`,
          ),
        );
      });
    }

    // SBE stages: outerStage, innerStage (for nlj, hash_lookup, etc.)
    if ("outerStage" in stage && stage.outerStage) {
      children.push(
        this.normalizeExecutionStageRecursive(
          stage.outerStage as ExecutionStage,
          depth + 1,
          `${path}.outer`,
        ),
      );
    }

    if ("innerStage" in stage && stage.innerStage) {
      children.push(
        this.normalizeExecutionStageRecursive(
          stage.innerStage as ExecutionStage,
          depth + 1,
          `${path}.inner`,
        ),
      );
    }

    // SBE conditional stages: thenStage, elseStage (for branch, etc.)
    if ("thenStage" in stage && stage.thenStage) {
      children.push(
        this.normalizeExecutionStageRecursive(
          stage.thenStage as ExecutionStage,
          depth + 1,
          `${path}.then`,
        ),
      );
    }

    if ("elseStage" in stage && stage.elseStage) {
      children.push(
        this.normalizeExecutionStageRecursive(
          stage.elseStage as ExecutionStage,
          depth + 1,
          `${path}.else`,
        ),
      );
    }

    // Sharded queries: SHARD_MERGE has a shards array with per-shard executionStages
    // Insert synthetic SHARD_EXECUTION nodes to preserve shard identity and timing
    if ("shards" in stage && Array.isArray(stage.shards)) {
      (stage.shards as unknown[]).forEach((shard, index) => {
        if (
          shard &&
          typeof shard === "object" &&
          "executionStages" in shard &&
          this.isExecutionStageStructure(
            (shard as Record<string, unknown>).executionStages,
          )
        ) {
          const shardRecord = shard as Record<string, unknown>;
          const shardName =
            typeof shardRecord.shardName === "string"
              ? shardRecord.shardName
              : `shard${index}`;
          const executionSuccess =
            typeof shardRecord.executionSuccess === "boolean"
              ? shardRecord.executionSuccess
              : undefined;

          const shardDefinition = getStage("mongos", "SHARD_EXECUTION");

          // Recursively normalize the actual execution stages as children of the synthetic node
          const shardChild = this.normalizeExecutionStageRecursive(
            shardRecord.executionStages as ExecutionStage,
            depth + 2,
            `${path}.shard.${index}.exec`,
          );

          const shardNode: NormalizedExecutionStage = {
            id: `${path}.shard.${index}`,
            stage: "SHARD_EXECUTION",
            category: shardDefinition?.category ?? StageCategory.Internal,
            iconName: shardDefinition?.iconName ?? "Server",
            definition: shardDefinition,
            structure: {},
            shardName,
            executionSuccess,
            // MongoDB uses "total*" prefix at shard level (totalDocsExamined, totalKeysExamined)
            metrics: {
              executionTimeMillis:
                typeof shardRecord.executionTimeMillis === "number"
                  ? shardRecord.executionTimeMillis
                  : undefined,
              nReturned:
                typeof shardRecord.nReturned === "number"
                  ? shardRecord.nReturned
                  : undefined,
              docsExamined:
                typeof shardRecord.totalDocsExamined === "number"
                  ? shardRecord.totalDocsExamined
                  : undefined,
              keysExamined:
                typeof shardRecord.totalKeysExamined === "number"
                  ? shardRecord.totalKeysExamined
                  : undefined,
            },
            children: [shardChild],
            depth: depth + 1,
          };

          children.push(shardNode);
        }
      });
    }

    // Calculate efficiency metrics
    let efficiency: { selectivity?: number; indexUsage?: number } | undefined;
    if (
      metrics.nReturned !== undefined &&
      metrics.docsExamined !== undefined &&
      metrics.docsExamined > 0
    ) {
      efficiency = {
        selectivity: metrics.nReturned / metrics.docsExamined,
      };
      if (metrics.keysExamined !== undefined && metrics.keysExamined > 0) {
        efficiency.indexUsage = metrics.nReturned / metrics.keysExamined;
      }
    }

    const stageName = this.getStringMetric(stage, "stage") ?? "UNKNOWN";
    const definition =
      getStage("execution", stageName) ?? getStage("mongos", stageName);

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

  /**
   * Extract execution stages from sharded find queries
   * Handles both SINGLE_SHARD and SHARD_MERGE patterns
   */
  private static extractFromShardedFind(
    shards: unknown[],
  ): ExplainStage | WinningPlan | null {
    if (!Array.isArray(shards) || shards.length === 0) {
      return null;
    }

    // Choose primary shard based on execution activity
    const primaryShard = this.selectPrimaryShard(shards);
    if (!primaryShard) {
      return null;
    }

    // Extract execution stages from the primary shard
    if (
      primaryShard &&
      typeof primaryShard === "object" &&
      "executionStages" in primaryShard &&
      this.isExecutionStageStructure(primaryShard.executionStages)
    ) {
      return primaryShard.executionStages as ExplainStage;
    }

    // Fallback to winningPlan if no execution stages
    if (
      primaryShard &&
      typeof primaryShard === "object" &&
      "winningPlan" in primaryShard &&
      this.isExecutionStageStructure(primaryShard.winningPlan)
    ) {
      return primaryShard.winningPlan as WinningPlan;
    }

    return null;
  }

  /**
   * Select primary shard from array format (sharded find queries)
   * Chooses shard with most execution activity
   */
  private static selectPrimaryShard(
    shards: unknown[],
  ): Record<string, unknown> | null {
    let primaryShard: Record<string, unknown> | null = null;
    let maxActivity = 0;

    for (const shard of shards) {
      if (!shard || typeof shard !== "object") continue;

      const shardObj = shard as Record<string, unknown>;
      const activity = this.calculateShardActivity(shardObj);

      if (activity > maxActivity || primaryShard === null) {
        maxActivity = activity;
        primaryShard = shardObj;
      }
    }

    return primaryShard;
  }

  /**
   * Select primary shard from record format (modern sharded aggregation)
   * Chooses shard with most execution activity
   */
  private static selectPrimaryShardFromRecord(
    shards: Record<string, unknown>,
  ): Record<string, unknown> | null {
    let primaryShard: Record<string, unknown> | null = null;
    let maxActivity = 0;

    for (const [, shardData] of Object.entries(shards)) {
      if (!shardData || typeof shardData !== "object") continue;

      const shardObj = shardData as Record<string, unknown>;
      const activity = this.calculateShardActivity(shardObj);

      if (activity > maxActivity || primaryShard === null) {
        maxActivity = activity;
        primaryShard = shardObj;
      }
    }

    return primaryShard;
  }

  /**
   * Calculate shard execution activity for primary shard selection
   * Higher score indicates more active shard
   */
  private static calculateShardActivity(
    shard: Record<string, unknown>,
  ): number {
    let activity = 0;

    // Check executionStats metrics first
    if (shard.executionStats && typeof shard.executionStats === "object") {
      const stats = shard.executionStats as Record<string, unknown>;
      activity += this.getNumericValue(stats, "nReturned") * 10; // Weight documents returned highly
      activity += this.getNumericValue(stats, "executionTimeMillis") * 1;
      activity += this.getNumericValue(stats, "totalDocsExamined") * 2;
      activity += this.getNumericValue(stats, "totalKeysExamined") * 1;
    }

    // Check executionStages for direct metrics
    if (shard.executionStages && typeof shard.executionStages === "object") {
      const stages = shard.executionStages as Record<string, unknown>;
      activity += this.getNumericValue(stages, "nReturned") * 10;
      activity += this.getNumericValue(stages, "executionTimeMillis") * 1;
      activity += this.getNumericValue(stages, "docsExamined") * 2;
    }

    // If no execution stats, just return 1 to make it selectable
    return activity > 0 ? activity : 1;
  }

  /**
   * Safely get numeric value from object
   */
  private static getNumericValue(
    obj: Record<string, unknown>,
    key: string,
  ): number {
    const value = obj[key];
    return typeof value === "number" ? value : 0;
  }

  /**
   * Safely extract numeric metrics from stage
   */
  private static getMetric(
    stage: ExplainStage | WinningPlan,
    key: string,
  ): number | undefined {
    return getNumericProperty(stage, key);
  }

  /**
   * Safely extract string metrics from stage
   */
  private static getStringMetric(
    stage: ExplainStage | WinningPlan,
    key: string,
  ): string | undefined {
    return getStringProperty(stage, key);
  }

  /**
   * Analyze plan selection from allPlansExecution data
   *
   * IMPORTANT: For apples-to-apples comparison, we use trial execution data
   * for ALL plans (including the winning plan). allPlansExecution[0] contains
   * the winning plan's trial metrics, and the rest are rejected plans.
   */
  static analyzePlanSelection(plan: ExplainPlan): PlanSelectionAnalysis | null {
    // Check if we have allPlansExecution data
    if (
      !plan.executionStats?.allPlansExecution ||
      plan.executionStats.allPlansExecution.length === 0
    ) {
      return null;
    }

    // Use trial data for fair comparison: allPlansExecution[0] is winning plan's trial
    const allPlans = plan.executionStats.allPlansExecution;
    const winningPlan = this.createPlanComparison(allPlans[0]!, "winning");
    const rejectedPlans = allPlans
      .slice(1) // Skip first entry (winning plan)
      .map((rejectedPlan) =>
        this.createPlanComparison(rejectedPlan, "rejected"),
      );

    const recommendation = this.generatePlanRecommendation(
      winningPlan,
      rejectedPlans,
    );
    const insights = this.generatePlanInsights(winningPlan, rejectedPlans);

    // Extract optimization time and planner limits from queryPlanner
    const optimizationTimeMillis = plan.queryPlanner?.optimizationTimeMillis;
    const plannerLimits = {
      maxIndexedOrSolutionsReached:
        plan.queryPlanner?.maxIndexedOrSolutionsReached,
      maxIndexedAndSolutionsReached:
        plan.queryPlanner?.maxIndexedAndSolutionsReached,
      maxScansToExplodeReached: plan.queryPlanner?.maxScansToExplodeReached,
    };

    // Extract cache information
    const queryHashValue = plan.queryHash ?? plan.queryPlanner?.queryHash;
    const cacheInfo = {
      queryHash:
        typeof queryHashValue === "string" ? queryHashValue : undefined,
      planCacheKey: plan.queryPlanner?.planCacheKey,
      planCacheShapeHash: plan.queryPlanner?.planCacheShapeHash,
      isCached: plan.queryPlanner?.winningPlan?.isCached,
      queryShapeHash: plan.queryShapeHash,
    };

    // Extract index selection factors
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

  /**
   * Create a plan comparison object from execution stats
   */
  private static createPlanComparison(
    stats: ExecutionStats,
    planType: "winning" | "rejected",
  ): PlanComparison {
    const nReturned = stats.nReturned ?? 0;
    const totalDocsExamined = stats.totalDocsExamined ?? 0;
    const totalKeysExamined = stats.totalKeysExamined ?? 0;
    const executionTimeMillis =
      stats.executionTimeMillis ?? stats.executionTimeMillisEstimate ?? 0;

    // Extract MongoDB-specific work metrics from execution stages
    const { works, advanced } = this.extractWorkMetrics(stats.executionStages);

    // Calculate efficiency metrics including MongoDB's productivity
    const selectivity =
      totalDocsExamined > 0 ? nReturned / totalDocsExamined : 0;
    const keyEfficiency =
      totalKeysExamined > 0 ? nReturned / totalKeysExamined : 0;
    const timePerDoc = nReturned > 0 ? executionTimeMillis / nReturned : 0;
    const productivity = works > 0 ? advanced / works : 0; // MongoDB's core metric

    // Extract index name and stages
    const indexName = this.extractIndexName(stats.executionStages);
    const stages = this.extractStageNames(stats.executionStages);

    // Detect EOF bonus (+1.0) and tie-breaker bonuses (ε values)
    const eofBonus = this.detectEofBonus(stats.executionStages);
    const tieBreakers = this.detectTieBreakers(stats.executionStages);

    return {
      planType,
      efficiency: {
        selectivity,
        keyEfficiency,
        timePerDoc,
        productivity,
      },
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
   * Extract MongoDB work metrics (works and advanced) from execution stages
   *
   * IMPORTANT: MongoDB's work metrics are already cumulative at each stage level.
   * The root stage's works/advanced includes all child stage work, so we
   * should NOT recursively sum them (that would cause double-counting).
   *
   * Example: FETCH (works: 101) -> IXSCAN (works: 101)
   * Correct: Use 101 from root FETCH stage
   * Wrong: Sum 101 + 101 = 202 (double-counted!)
   */
  private static extractWorkMetrics(stage: unknown): {
    works: number;
    advanced: number;
  } {
    if (!stage) return { works: 0, advanced: 0 };

    // Extract from root stage only - metrics are already cumulative
    if (typeof stage === "object" && stage !== null) {
      const stageObj = stage as Record<string, unknown>;
      const works = typeof stageObj.works === "number" ? stageObj.works : 0;
      const advanced =
        typeof stageObj.advanced === "number" ? stageObj.advanced : 0;
      return { works, advanced };
    }

    return { works: 0, advanced: 0 };
  }

  /**
   * Detect MongoDB tie-breaker bonuses (ε values) from execution stages
   */
  private static detectTieBreakers(stage: unknown): {
    noFetch: boolean;
    noSort: boolean;
    noIntersection: boolean;
  } {
    if (!stage)
      return {
        noFetch: true,
        noSort: true,
        noIntersection: true,
      };

    const stageNames = this.collectStageNames(stage);

    return {
      noFetch: !stageNames.includes("FETCH"),
      noSort: !stageNames.includes("SORT"),
      noIntersection:
        !stageNames.includes("AND_HASH") && !stageNames.includes("AND_SORTED"),
    };
  }

  /**
   * Detect EOF bonus (+1.0 point) from execution stages
   * EOF bonus is awarded if all documents are retrieved (isEOF: 1)
   */
  private static detectEofBonus(stage: unknown): boolean {
    if (!stage) return false;

    // Check if EOF was reached (isEOF: 1 in root stage)
    return (
      typeof stage === "object" &&
      stage !== null &&
      "isEOF" in stage &&
      stage.isEOF === 1
    );
  }

  /**
   * Recursively collect all stage names in the execution plan
   */
  private static collectStageNames(stage: unknown): string[] {
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
        stages.push(...this.collectStageNames(stageObj.inputStage));
      }

      if (Array.isArray(stageObj.inputStages)) {
        for (const inputStage of stageObj.inputStages) {
          stages.push(...this.collectStageNames(inputStage));
        }
      }
    }

    return stages;
  }

  /**
   * Extract index name from execution stages
   */
  private static extractIndexName(stage: unknown): string | undefined {
    if (!this.isExecutionStageStructure(stage)) {
      return undefined;
    }

    if (stage.indexName) {
      return stage.indexName;
    }

    if (stage.inputStage) {
      return this.extractIndexName(stage.inputStage);
    }

    if (stage.inputStages && Array.isArray(stage.inputStages)) {
      for (const inputStage of stage.inputStages) {
        const indexName = this.extractIndexName(inputStage);
        if (indexName) {
          return indexName;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract stage names from execution stages
   */
  private static extractStageNames(stage: unknown): string[] {
    if (!this.isExecutionStageStructure(stage)) {
      return [];
    }

    const stages: string[] = [];

    if (stage.stage) {
      stages.push(stage.stage);
    }

    if (stage.inputStage) {
      stages.push(...this.extractStageNames(stage.inputStage));
    }

    if (stage.inputStages && Array.isArray(stage.inputStages)) {
      for (const inputStage of stage.inputStages) {
        stages.push(...this.extractStageNames(inputStage));
      }
    }

    return stages;
  }

  /**
   * Generate plan recommendation based on comparison
   */
  private static generatePlanRecommendation(
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

  /**
   * Generate insights about plan selection
   */
  private static generatePlanInsights(
    winning: PlanComparison,
    rejected: PlanComparison[],
  ): string[] {
    const insights: string[] = [];

    // Efficiency comparison
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

    // Index usage insights
    if (winning.indexName) {
      insights.push(`Winning plan uses index: ${winning.indexName}`);
    } else {
      insights.push("Winning plan does not use an index (COLLSCAN)");
    }

    // Stage complexity insights
    if (winning.stages && winning.stages.length > 3) {
      insights.push(
        "Winning plan has complex stage hierarchy - consider query optimization.",
      );
    }

    return insights;
  }

  /**
   * Generate a summary of the explain plan
   *
   * IMPORTANT: MongoDB provides pre-computed cumulative metrics in executionStats.
   * We use those totals instead of summing per-stage metrics (which would be incorrect).
   *
   * Traverses the tree only for:
   * - Counting total stages
   * - Detecting stage types (IXSCAN, COLLSCAN)
   */
  static summarize(
    normalizedPlan: NormalizedStage,
    originalPlan: ExplainPlan,
  ): {
    totalStages: number;
    totalDocsExamined: number;
    totalKeysExamined: number;
    totalReturned: number;
    executionTimeMs: number;
    hasIndexScans: boolean;
    hasCollectionScans: boolean;
  } {
    // Use MongoDB's pre-computed cumulative totals from executionStats
    // These are the source of truth, not per-stage metrics
    const summary = {
      totalStages: 0,
      totalDocsExamined: originalPlan.executionStats?.totalDocsExamined ?? 0,
      totalKeysExamined: originalPlan.executionStats?.totalKeysExamined ?? 0,
      totalReturned: originalPlan.executionStats?.nReturned ?? 0,
      executionTimeMs: (originalPlan.executionStats?.executionTimeMillis ??
        originalPlan.executionStats?.executionTimeMillisEstimate ??
        0) as number,
      hasIndexScans: false,
      hasCollectionScans: false,
    };

    // Traverse tree only for stage counting and type detection
    function traverse(stage: NormalizedStage) {
      summary.totalStages++;

      // Check stage types using category
      if (stage.category === StageCategory.IndexScan) {
        summary.hasIndexScans = true;
      } else if (stage.category === StageCategory.CollectionScan) {
        summary.hasCollectionScans = true;
      }

      // Traverse children
      for (const child of stage.children) {
        traverse(child);
      }
    }

    traverse(normalizedPlan);
    return summary;
  }
}
