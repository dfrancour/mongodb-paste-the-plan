/**
 * SBE plan extraction from MongoDB explain plans.
 *
 * Extracts parsed SBE plans and hybrid SBE plans from validated explain plans.
 * Supports both regular SBE plans and aggregation SBE plans (stages[].$cursor).
 */
import type {
  ExplainPlan,
  WinningPlan,
  ExplainStage,
  ParsedSBEPlan,
  HybridSBEPlan,
  SBEStage,
  SlotLineage,
} from "#types/explain-plan";
import { getNumericProperty, getStringProperty } from "#lib/utils/jsxUtils";
import { SBEParser } from "./sbeParser";
import { buildSlotLineages } from "#lib/analyzers";
import { getCursorContentFromPlan } from "./cursorExtractor";
import { isSBEPlan } from "./detection";

// ============================================================================
// Public API
// ============================================================================

/** Extract SBE plan from explain plan (supports multiple formats) */
export function extractSBEPlan(plan: ExplainPlan): ParsedSBEPlan | null {
  if (!isSBEPlan(plan)) return null;

  // Method 1: SBE aggregation plans have stages array with cursor-type stages
  const cursorContent = getCursorContentFromPlan(plan);
  if (cursorContent?.queryPlanner?.winningPlan?.slotBasedPlan) {
    const slotBasedPlan = cursorContent.queryPlanner.winningPlan.slotBasedPlan;
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

/** Extract hybrid SBE plan that combines query plan hierarchy with SBE implementation */
export function extractHybridSBEPlan(plan: ExplainPlan): HybridSBEPlan | null {
  if (!isSBEPlan(plan)) return null;

  // Method 1: SBE aggregation plans
  const cursorContent = getCursorContentFromPlan(plan);
  if (
    cursorContent?.queryPlanner?.winningPlan?.slotBasedPlan &&
    cursorContent?.queryPlanner?.winningPlan?.queryPlan
  ) {
    const queryPlan = cursorContent.queryPlanner.winningPlan.queryPlan;
    const slotBasedPlan = cursorContent.queryPlanner.winningPlan.slotBasedPlan;
    return parseHybridSBEPlan(queryPlan, slotBasedPlan);
  }

  // Method 2: Regular SBE plans
  if (
    plan.queryPlanner?.winningPlan?.slotBasedPlan &&
    plan.queryPlanner?.winningPlan?.queryPlan
  ) {
    const queryPlan = plan.queryPlanner.winningPlan.queryPlan;
    const slotBasedPlan = plan.queryPlanner.winningPlan.slotBasedPlan;
    return parseHybridSBEPlan(queryPlan, slotBasedPlan);
  }

  return null;
}

// ============================================================================
// Internal helpers
// ============================================================================

function parseHybridSBEPlan(
  queryPlan: WinningPlan,
  slotBasedPlan: { slots: string; stages: string },
): HybridSBEPlan {
  const sbeStages = SBEParser.parseStages(slotBasedPlan.stages);
  const slotEnvironment = SBEParser.parseSlotEnvironment(slotBasedPlan.slots);
  const slotLineages = buildSlotLineages(sbeStages, slotEnvironment);

  const queryStages = flattenQueryPlanStages(queryPlan);
  const sbeGroups = groupSBEStagesByNodeId(sbeStages);

  const hybridStages = queryStages.map((queryStage, index) => ({
    queryPlanStage: {
      stage: queryStage.stage ?? "UNKNOWN",
      planNodeId: queryStage.planNodeId ?? index + 1,
      indexName: getStringProperty(queryStage as ExplainStage, "indexName"),
      filter: "filter" in queryStage ? queryStage.filter : undefined,
      keyPattern:
        "keyPattern" in queryStage ? queryStage.keyPattern : undefined,
      direction: getStringProperty(queryStage as ExplainStage, "direction"),
      indexBounds:
        "indexBounds" in queryStage ? queryStage.indexBounds : undefined,
      sort: "sort" in queryStage ? queryStage.sort : undefined,
      limit: getNumericProperty(queryStage as ExplainStage, "limit"),
      projection:
        "projection" in queryStage ? queryStage.projection : undefined,
    },
    sbeImplementation: {
      stages: sbeGroups.get(queryStage.planNodeId ?? index + 1) ?? [],
      primarySlotFlow: calculateSlotFlow(
        sbeGroups.get(queryStage.planNodeId ?? index + 1) ?? [],
        slotLineages,
      ),
    },
    position: {
      level: queryStages.length - 1 - index,
      order: 0,
    },
    metrics: {
      nReturned: getNumericProperty(queryStage as ExplainStage, "nReturned"),
      keysExamined: getNumericProperty(
        queryStage as ExplainStage,
        "keysExamined",
      ),
      docsExamined: getNumericProperty(
        queryStage as ExplainStage,
        "docsExamined",
      ),
      executionTimeMillis: getNumericProperty(
        queryStage as ExplainStage,
        "executionTimeMillis",
      ),
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

function flattenQueryPlanStages(
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

function groupSBEStagesByNodeId(
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

function calculateSlotFlow(
  sbeStages: SBEStage[],
  slotLineages: SlotLineage[],
): { input: string[]; output: string[]; internal: string[] } {
  if (sbeStages.length === 0) {
    return { input: [], output: [], internal: [] };
  }

  const allSlots = new Set<string>();
  for (const stage of sbeStages) {
    for (const slotId of stage.slotReferences) {
      allSlots.add(slotId);
    }
  }

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
