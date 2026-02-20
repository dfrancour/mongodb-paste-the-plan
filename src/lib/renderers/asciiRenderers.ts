import type { NormalizedStage } from "#types/explain-plan";
import type { ParsedSBEPlan, SBEStage } from "#types/explain-plan";

/**
 * ASCII rendering utilities for MongoDB execution plans
 *
 * Provides tree-like ASCII visualizations for both Classic and SBE execution plans,
 * inspired by the patterns shown in MongoDB documentation.
 */

/**
 * Tree drawing characters
 */
const TREE_CHARS = {
  branch: "├─",
  lastBranch: "└─",
  vertical: "│",
  space: "  ",
  horizontal: "─",
} as const;

/**
 * Format execution metrics for display
 */
function formatMetrics(
  executionTimeMillis?: number,
  nReturned?: number,
  docsExamined?: number,
  keysExamined?: number,
): string {
  const parts: string[] = [];

  if (typeof executionTimeMillis === "number") {
    parts.push(`executionTimeMillis=${executionTimeMillis}`);
  }
  if (typeof nReturned === "number") {
    parts.push(`nReturned=${nReturned}`);
  }
  if (typeof docsExamined === "number") {
    parts.push(`docsExamined=${docsExamined}`);
  }
  if (typeof keysExamined === "number") {
    parts.push(`keysExamined=${keysExamined}`);
  }

  return parts.length > 0 ? ` [${parts.join(", ")}]` : "";
}

/**
 * Renders Classic MongoDB execution plans as ASCII trees
 */
export class PlanFlowASCIIRenderer {
  /**
   * Render a complete plan as ASCII tree with mode support
   * @param rootStage - The root stage to render
   * @param mode - "plan" (structural only) or "execution" (with metrics)
   * @param engine - "classic" or "sbe" engine type
   */
  static renderClassicPlanWithMode(
    rootStage: NormalizedStage,
    mode: "plan" | "execution" = "execution",
    engine: "classic" | "sbe" = "classic",
  ): string {
    if (!rootStage) {
      const planType =
        mode === "plan" ? "Query Plan Structure" : "Query Execution Plan";
      const engineLabel = engine === "sbe" ? "SBE Engine" : "Classic Engine";
      return `${planType} (${engineLabel})\n\nNo plan data available`;
    }

    const lines: string[] = [];
    const planType =
      mode === "plan" ? "Query Plan Structure" : "Query Execution Plan";
    const engineLabel = engine === "sbe" ? "SBE Engine" : "Classic Engine";
    lines.push(`${planType} (${engineLabel})`);
    lines.push("");

    this.renderStageRecursive(rootStage, "", true, lines, mode);

    return lines.join("\n");
  }

  /**
   * Recursively render a stage and its children
   * @param mode - "plan" (structural only) or "execution" (with metrics)
   */
  private static renderStageRecursive(
    stage: NormalizedStage,
    prefix: string,
    isLast: boolean,
    lines: string[],
    mode: "plan" | "execution" = "execution",
  ): void {
    const connector = isLast ? TREE_CHARS.lastBranch : TREE_CHARS.branch;

    // Build stage line - start with stage name
    let stageLine = `${prefix}${connector} ${stage.stage}`;

    // Add execution metrics only in execution mode
    if (mode === "execution") {
      const metricsStr = formatMetrics(
        stage.metrics?.executionTimeMillis,
        stage.metrics?.nReturned,
        stage.metrics?.docsExamined,
        stage.metrics?.keysExamined,
      );
      stageLine += metricsStr;
    }

    // Add index name if available (shown in both modes)
    if (stage.structure?.indexName) {
      stageLine += ` (${stage.structure.indexName})`;
    }

    lines.push(stageLine);

    // Render children
    const children = stage.children || [];
    if (children.length > 0) {
      const childPrefix =
        prefix + (isLast ? TREE_CHARS.space : TREE_CHARS.vertical + " ");

      children.forEach((child, index) => {
        const isLastChild = index === children.length - 1;
        this.renderStageRecursive(child, childPrefix, isLastChild, lines, mode);
      });
    }
  }

  /**
   * Render SBE execution plan with stage hierarchy
   */
  static renderSBEPlan(parsedPlan: ParsedSBEPlan): string {
    if (!parsedPlan?.stages) {
      return "Query Execution Plan (SBE Engine)\n\nNo SBE execution plan data available";
    }

    const lines: string[] = [];
    lines.push("Query Execution Plan (SBE Engine)");
    lines.push("");

    // Group stages by planNodeId for hierarchy
    const stagesByNode = new Map<number, SBEStage[]>();
    parsedPlan.stages.forEach((stage) => {
      const nodeId = stage.nodeId || 0;
      if (!stagesByNode.has(nodeId)) {
        stagesByNode.set(nodeId, []);
      }
      stagesByNode.get(nodeId)!.push(stage);
    });

    // Render stages in execution order (reverse of node IDs typically)
    const sortedNodeIds = Array.from(stagesByNode.keys()).sort((a, b) => b - a);

    sortedNodeIds.forEach((nodeId, index) => {
      const stages = stagesByNode.get(nodeId)!;
      const isLast = index === sortedNodeIds.length - 1;
      const connector = isLast ? TREE_CHARS.lastBranch : TREE_CHARS.branch;

      // Get stage name from queryPlan if available
      const planStageName = parsedPlan.queryPlanStages.get(nodeId) ?? "UNKNOWN";

      lines.push(`${connector} [${nodeId}] ${planStageName}`);

      // Render individual SBE stages for this node
      stages.forEach((stage, stageIndex) => {
        const isLastStage = stageIndex === stages.length - 1;
        const stagePrefix = isLast ? "    " : "│   ";
        const stageConnector = isLastStage
          ? TREE_CHARS.lastBranch
          : TREE_CHARS.branch;

        const slotsList =
          stage.slotReferences && Array.isArray(stage.slotReferences)
            ? stage.slotReferences.join(", ")
            : "";
        lines.push(
          `${stagePrefix}${stageConnector} ${stage.stageType} ${slotsList}`,
        );
      });

      if (!isLast) lines.push("│");
    });

    return lines.join("\n");
  }
}

/**
 * Renders SBE slot flows and data lineage as ASCII diagrams
 */
export class SlotFlowASCIIRenderer {
  /**
   * Render slot lineage and data flow
   */
  static renderSlotFlow(parsedPlan: ParsedSBEPlan): string {
    if (!parsedPlan) {
      return "SBE Slot-Based Execution Flow\n\nNo SBE plan data available";
    }

    const lines: string[] = [];
    lines.push("SBE Slot-Based Execution Flow");
    lines.push("");

    // Extract result slot from environment
    const resultSlot = this.extractResultSlot(parsedPlan.slotEnvironment);

    // Render stage tree and slot flow side by side
    lines.push("Stage Tree:                 Slot Flow:");

    const stageLines = this.renderStageTree(parsedPlan);
    const slotLines = this.renderSlotChain(parsedPlan, resultSlot);

    // Combine stage and slot visualization
    const maxLines = Math.max(stageLines.length, slotLines.length);
    for (let i = 0; i < maxLines; i++) {
      const stagePart = (stageLines[i] ?? "").padEnd(28);
      const slotPart = slotLines[i] ?? "";
      lines.push(`${stagePart}${slotPart}`);
    }

    lines.push("");
    lines.push("Slot Details:");
    lines.push(this.renderSlotDetails(parsedPlan));

    return lines.join("\n");
  }

  /**
   * Extract the result slot from environment string
   */
  private static extractResultSlot(environment: unknown): string {
    if (
      typeof environment === "object" &&
      environment &&
      "resultSlot" in environment
    ) {
      return String((environment as { resultSlot: unknown }).resultSlot);
    }

    // Try to parse from slot string if it's available
    const envString = environment?.toString() ?? "";
    const regex = /\$\$RESULT=(\w+)/;
    const match = regex.exec(envString);
    return match?.[1] ?? "s?";
  }

  /**
   * Render stage hierarchy tree
   */
  private static renderStageTree(parsedPlan: ParsedSBEPlan): string[] {
    const lines: string[] = [];

    // Group by planNodeId and sort
    const nodeIds = Array.from(
      new Set(parsedPlan.stages.map((s) => s.nodeId)),
    ).sort((a, b) => b - a);

    nodeIds.forEach((nodeId, index) => {
      const isLast = index === nodeIds.length - 1;
      const connector = isLast ? TREE_CHARS.lastBranch : TREE_CHARS.branch;
      const stageName = parsedPlan.queryPlanStages.get(nodeId) ?? "stage";

      lines.push(`${connector} [${nodeId}] ${stageName}`);

      if (!isLast) {
        lines.push("│");
      }
    });

    return lines;
  }

  /**
   * Render slot data flow chain
   */
  private static renderSlotChain(
    parsedPlan: ParsedSBEPlan,
    resultSlot: string,
  ): string[] {
    const lines: string[] = [];

    // Build simple slot flow based on lineages
    const slotFlow = this.buildSlotFlow(parsedPlan, resultSlot);

    if (slotFlow.length > 0) {
      // Show horizontal flow
      const flowLine = slotFlow.join("──→");
      if (flowLine.length > 30) {
        // Multi-line flow for long chains
        const chunks = this.chunkSlotFlow(slotFlow, 3);
        chunks.forEach((chunk, index) => {
          const line = chunk.join("──→");
          if (index === chunks.length - 1) {
            lines.push(`${line} (result)`);
          } else {
            lines.push(`${line}──┐`);
            lines.push("       └─→");
          }
        });
      } else {
        lines.push(`${flowLine}──→${resultSlot} (result)`);
      }
    } else {
      lines.push(`${resultSlot} (result)`);
    }

    return lines;
  }

  /**
   * Build slot flow chain from lineages
   */
  private static buildSlotFlow(
    parsedPlan: ParsedSBEPlan,
    resultSlot: string,
  ): string[] {
    // Simplified slot flow - could be enhanced with actual lineage analysis
    const uniqueSlots = new Set<string>();

    parsedPlan.stages.forEach((stage) => {
      if (stage.slotReferences && Array.isArray(stage.slotReferences)) {
        stage.slotReferences.forEach((slot) => {
          if (slot !== resultSlot) {
            uniqueSlots.add(slot);
          }
        });
      }
    });

    return Array.from(uniqueSlots).slice(0, 4); // Limit for readability
  }

  /**
   * Chunk slot flow for multi-line display
   */
  private static chunkSlotFlow(slots: string[], chunkSize: number): string[][] {
    const chunks: string[][] = [];
    for (let i = 0; i < slots.length; i += chunkSize) {
      chunks.push(slots.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Render detailed slot information
   */
  private static renderSlotDetails(parsedPlan: ParsedSBEPlan): string {
    const lines: string[] = [];

    // Collect unique slots with their usage - include both from stages and lineages
    const slotInfo = new Map<
      string,
      { createdBy: string[]; usedBy: string[] }
    >();

    // Process slot lineages if available (primary source)
    if (parsedPlan.slotLineages && parsedPlan.slotLineages.length > 0) {
      parsedPlan.slotLineages.forEach((lineage) => {
        if (!slotInfo.has(lineage.slotId)) {
          slotInfo.set(lineage.slotId, { createdBy: [], usedBy: [] });
        }
        const info = slotInfo.get(lineage.slotId)!;
        info.createdBy.push(lineage.definition.createdAt);
        lineage.usages.forEach((usage) => {
          info.usedBy.push(usage.usedAt);
        });
      });
    }

    // Fallback to stages if no lineages available
    if (slotInfo.size === 0 && parsedPlan.stages) {
      parsedPlan.stages.forEach((stage) => {
        if (stage.slotReferences && Array.isArray(stage.slotReferences)) {
          stage.slotReferences.forEach((slot) => {
            if (!slotInfo.has(slot)) {
              slotInfo.set(slot, { createdBy: [], usedBy: [] });
            }
            // Simplified - in real implementation, distinguish between creation and usage
            const nodeRef = `[${stage.nodeId}]`;
            slotInfo.get(slot)!.createdBy.push(nodeRef);
          });
        }
      });
    }

    // Render slot details table
    const entries = Array.from(slotInfo.entries()).slice(0, 6);
    if (entries.length === 0) {
      lines.push("No slot information available");
    } else {
      entries.forEach(([slot, info]) => {
        const createdBy =
          info.createdBy.length > 0 ? info.createdBy.join(", ") : "unknown";
        const usedBy =
          info.usedBy.length > 0 ? ` → Used by: ${info.usedBy.join(", ")}` : "";
        lines.push(`${slot.padEnd(4)}: Created by ${createdBy}${usedBy}`);
      });
    }

    return lines.join("\n");
  }
}
