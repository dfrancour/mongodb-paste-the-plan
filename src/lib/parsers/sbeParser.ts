import type {
  SlotBasedPlan,
  SBESlotEnvironment,
  SBEStage,
  SBESlotInfo,
  SBESlotType,
  ParsedSBEPlan,
  SBEStageMetrics,
  SBEComplexityLevel,
  SBEStageExecutionStats,
  SBEPerformanceLevel,
  SBEIndexStats,
  SBEBranchStats,
} from "#types/explain-plan";
import { buildSlotLineages } from "#lib/analyzers";

/**
 * Parses SBE (Slot-Based Execution) plans into structured data
 *
 * SBE plans come as strings that need to be parsed:
 * - slots: "$$RESULT=s17 env: { s3 = Timestamp(...), ... }"
 * - stages: "[3] mkobj s17 [...] \n[3] project [...] \n..."
 */
export class SBEParser {
  /**
   * Parse a complete SBE plan from slotBasedPlan object
   */
  static parseSBEPlan(
    slotBasedPlan: SlotBasedPlan,
    queryPlan?: unknown,
    executionStages?: unknown,
  ): ParsedSBEPlan {
    const slotEnvironment = this.parseSlotEnvironment(slotBasedPlan.slots);
    const stages = this.parseStages(slotBasedPlan.stages);
    const slotLineages = this.buildSlotLineages(stages, slotEnvironment);
    const stageMetrics = this.calculateStageMetrics(stages);

    // Extract queryPlan stage names by planNodeId
    const queryPlanStages = queryPlan
      ? this.extractQueryPlanStages(queryPlan)
      : new Map<number, string>();

    // Extract execution statistics by planNodeId
    const executionStatsMap = executionStages
      ? this.extractExecutionStats(executionStages)
      : new Map<number, SBEStageExecutionStats[]>();

    return {
      explainVersion: "2",
      slotEnvironment,
      stages,
      slotLineages,
      stageMetrics,
      queryPlanStages,
      executionStatsMap,
      originalSlotString: slotBasedPlan.slots,
      originalStagesString: slotBasedPlan.stages,
    };
  }

  /**
   * Parse slot environment from slots string
   * Format: "$$RESULT=s17 env: { s3 = Timestamp(...), s1 = TimeZoneDatabase(...), ... }"
   */
  static parseSlotEnvironment(slotsString: string): SBESlotEnvironment {
    const resultSlotRegex = /\$\$RESULT=(\w+)/;
    const resultSlotMatch = resultSlotRegex.exec(slotsString);
    const resultSlot = resultSlotMatch ? resultSlotMatch[1] : "";

    const slots: Record<string, SBESlotInfo> = {};

    // Extract environment slots from "env: { ... }" section
    const envRegex = /env:\s*\{([^}]+)\}/;
    const envMatch = envRegex.exec(slotsString);
    if (envMatch?.[1]) {
      const envContent = envMatch[1];

      // Parse individual slot assignments manually due to complex nested parentheses
      // Format: "s3 = Timestamp(1692938942, 6) (CLUSTER_TIME), s1 = TimeZoneDatabase(...) (timeZoneDB)"
      // We can't just split on commas because there are commas inside the values
      // Let's parse this character by character to find proper assignment boundaries
      const assignments: string[] = [];
      let currentAssignment = "";
      let parenDepth = 0;
      let inAssignment = false;

      for (let i = 0; i < envContent.length; i++) {
        const char = envContent[i];

        if (char === "=" && !inAssignment) {
          inAssignment = true;
          currentAssignment += char;
        } else if (char === "(") {
          parenDepth++;
          currentAssignment += char;
        } else if (char === ")") {
          parenDepth--;
          currentAssignment += char;

          // If we're back to depth 0 and we were in an assignment, this might be the end
          if (parenDepth === 0 && inAssignment) {
            // Look ahead to see if there's a comma followed by a space and variable name
            let j = i + 1;
            while (
              j < envContent.length &&
              (envContent[j] === " " || envContent[j] === ",")
            ) {
              j++;
            }
            if (j < envContent.length && /[a-zA-Z]/.test(envContent[j] ?? "")) {
              // This looks like the end of an assignment
              assignments.push(currentAssignment.trim());
              currentAssignment = "";
              inAssignment = false;

              // Skip the comma and spaces
              while (
                i + 1 < envContent.length &&
                (envContent[i + 1] === " " || envContent[i + 1] === ",")
              ) {
                i++;
              }
            }
          }
        } else if (char === "," && parenDepth === 0 && !inAssignment) {
          // This comma is a separator between assignments
          if (currentAssignment.trim()) {
            assignments.push(currentAssignment.trim());
            currentAssignment = "";
          }
        } else {
          currentAssignment += char;
        }
      }

      // Add the last assignment
      if (currentAssignment.trim()) {
        assignments.push(currentAssignment.trim());
      }

      for (const assignment of assignments) {
        // Parse each assignment: "s3 = Timestamp(1692938942, 6) (CLUSTER_TIME)"
        const eqIndex = assignment.indexOf("=");
        if (eqIndex === -1) continue;

        const slotId = assignment.substring(0, eqIndex).trim();
        const rest = assignment.substring(eqIndex + 1).trim();

        // For complex parsing, we need to handle nested parentheses carefully
        // Find the rightmost closing paren that is preceded by an opening paren
        // that doesn't have a matching close between them
        let parenCount = 0;
        let lastDescStart = -1;

        for (let i = rest.length - 1; i >= 0; i--) {
          if (rest[i] === ")") {
            parenCount++;
            if (parenCount === 1) {
              // This is our potential description closing paren
              continue;
            }
          } else if (rest[i] === "(") {
            parenCount--;
            if (parenCount === 0) {
              // Check if this is likely a description start (preceded by space)
              if (i > 0 && rest[i - 1] === " ") {
                lastDescStart = i;
                break;
              }
            }
          }
        }

        if (lastDescStart > 0 && rest.endsWith(")")) {
          const value = rest.substring(0, lastDescStart).trim();
          const description = rest
            .substring(lastDescStart + 1, rest.length - 1)
            .trim();

          slots[slotId] = {
            value,
            type: this.inferSlotType(value, description),
            description,
          };
        } else {
          // No description found
          slots[slotId] = {
            value: rest,
            type: this.inferSlotType(rest, undefined),
            description: undefined,
          };
        }
      }
    }

    return {
      resultSlot: resultSlot ?? "",
      slots,
    };
  }

  /**
   * Parse stages string into structured SBE stages
   * Format: "[nodeId] stageType parameters \n[nodeId] stageType parameters \n..."
   */
  static parseStages(stagesString: string): SBEStage[] {
    const lines = stagesString
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const stages: SBEStage[] = [];
    const stageStack: SBEStage[] = [];

    for (const line of lines) {
      const stage = this.parseStageFromLine(line);
      if (!stage) continue;

      // Determine nesting level based on indentation
      const indentLevel = this.getIndentLevel(line);

      // Adjust stack based on indent level
      while (stageStack.length > indentLevel) {
        stageStack.pop();
      }

      // Set parent relationship
      if (stageStack.length > 0) {
        const parent = stageStack[stageStack.length - 1];
        if (parent) {
          parent.children.push(stage);
          stage.parent = parent;
        }
      } else {
        stages.push(stage);
      }

      stageStack.push(stage);
    }

    return stages;
  }

  /**
   * Parse individual stage line
   * Format examples:
   * "[3] mkobj s17 [_id = s12, total = s16] true false"
   * "[3] project [s16 = doubleDoubleSumFinalize (s14)]"
   * "[1] ixseek s8 s9 none s7 none none [s5 = 0, s6 = 1] @"collection" @"index" true"
   */
  private static parseStageFromLine(line: string): SBEStage | null {
    // Extract node ID: [3] stageType ...
    const nodeIdRegex = /^\s*\[(\d+)\]\s+(.+)/;
    const nodeIdMatch = nodeIdRegex.exec(line);
    if (!nodeIdMatch?.[1] || !nodeIdMatch?.[2]) return null;

    const nodeId = parseInt(nodeIdMatch[1]);
    const remainingLine = nodeIdMatch[2];

    // Extract stage type (first word)
    const parts = remainingLine.split(/\s+/);
    const stageType = parts[0];
    if (!stageType) return null;

    const details = remainingLine.substring(stageType.length).trim();

    // Extract slot references from the line
    const slotReferences = this.extractSlotReferences(line);

    return {
      nodeId,
      stageType,
      slotReferences,
      details,
      children: [],
    };
  }

  /**
   * Extract slot references (s1, s2, etc.) from a stage line
   */
  private static extractSlotReferences(line: string): string[] {
    const slotMatches = line.matchAll(/\b(s\d+)\b/g);
    const slots = Array.from(slotMatches, (match) => match[1]).filter(
      (slot): slot is string => Boolean(slot),
    );
    return [...new Set(slots)]; // Remove duplicates
  }

  /**
   * Get indentation level for nested stages (e.g., nlj left/right branches)
   */
  private static getIndentLevel(line: string): number {
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;

    // SBE uses tabs for nesting, each tab = 1 level
    const tabRegex = /^\t*/;
    const tabMatch = tabRegex.exec(line);
    const tabCount = tabMatch?.[0].length ?? 0;
    const spaceCount = Math.floor(indent / 4); // Assume 4 spaces = 1 level

    return Math.max(tabCount, spaceCount);
  }

  /**
   * Infer slot type from value and description
   */
  private static inferSlotType(
    value: string,
    description?: string,
  ): SBESlotType {
    if (description) {
      if (description.includes("CLUSTER_TIME") || description.includes("NOW")) {
        return "context_constant";
      }
      if (description.includes("SEARCH_META")) {
        return "context_constant";
      }
      if (description.includes("timeZoneDB")) {
        return "context_constant";
      }
    }

    if (value.startsWith("Timestamp(")) {
      return "context_constant";
    }

    if (value.startsWith("TimeZoneDatabase(")) {
      return "context_constant";
    }

    if (value === "Nothing") {
      return "literal";
    }

    if (/^\d+$/.exec(value)) {
      return "literal";
    }

    if (value.startsWith("KS(")) {
      return "index_bounds";
    }

    return "unknown";
  }

  /**
   * Build slot lineages by tracking slot usage across stages
   */
  private static buildSlotLineages(
    stages: SBEStage[],
    environment: SBESlotEnvironment,
  ) {
    return buildSlotLineages(stages, environment);
  }

  /**
   * Calculate performance metrics for each stage
   */
  static calculateStageMetrics(stages: SBEStage[]): SBEStageMetrics[] {
    return stages.map((stage) => ({
      stageId: `stage_${stage.nodeId}`,
      stageType: stage.stageType,
      nodeId: stage.nodeId,
      slotsConsumed: this.getConsumedSlots(stage),
      slotsProduced: this.getProducedSlots(stage),
      complexity: this.calculateComplexity(stage),
    }));
  }

  /**
   * Determine which slots a stage consumes (reads)
   * Based on actual SBE stage behavior and slot argument positions
   */
  private static getConsumedSlots(stage: SBEStage): string[] {
    const details = stage.details;

    switch (stage.stageType) {
      case "project":
        // project [s16 = doubleDoubleSumFinalize (s14)]
        // Consumes slots referenced in expression functions
        const consumed: string[] = [];
        const functionArgs = details.matchAll(/\(([s\d\s,]+)\)/g);
        for (const match of functionArgs) {
          if (match[1]) {
            const slots = match[1]
              .split(/[\s,]+/)
              .filter((s) => s.startsWith("s"));
            consumed.push(...slots);
          }
        }
        // Also consume slots referenced in simple assignments
        const simpleAssign = details.matchAll(/=\s*(s\d+)(?![\d\w])/g);
        for (const match of simpleAssign) {
          if (match[1]) {
            consumed.push(match[1]);
          }
        }
        return [...new Set(consumed)];

      case "mkobj":
      case "mkbson":
        // mkobj s17 [_id = s12, total = s16]
        // Consumes slots on the right side of assignments
        const assignmentRegex = /\[([^\]]+)\]/;
        const assignmentMatch = assignmentRegex.exec(details);
        if (assignmentMatch?.[1]) {
          const assignments = assignmentMatch[1];
          const slotMatches = assignments.matchAll(/=\s*(s\d+)/g);
          return Array.from(slotMatches, (match) => match[1]).filter(
            (slot): slot is string => Boolean(slot),
          );
        }
        return [];

      case "group":
      case "hash_agg":
        // group [s12] [s14 = aggDoubleDoubleSum (s13)]
        // Consumes group-by slots and aggregation input slots
        const groupRegex = /\[([^\]]+)\]\s*\[([^\]]+)\]/;
        const groupMatch = groupRegex.exec(details);
        const consumed2: string[] = [];

        if (groupMatch?.[1]) {
          // Group-by slots
          const groupSlots = groupMatch[1].matchAll(/s\d+/g);
          consumed2.push(...Array.from(groupSlots, (match) => match[0]));
        }

        if (groupMatch?.[2]) {
          // Aggregation input slots from function arguments
          const aggFunctions = groupMatch[2].matchAll(/\w+\(([s\d\s,]+)\)/g);
          for (const funcMatch of aggFunctions) {
            if (funcMatch[1]) {
              const slots = funcMatch[1]
                .split(/[\s,]+/)
                .filter((s) => s.startsWith("s"));
              consumed2.push(...slots);
            }
          }
        }
        return [...new Set(consumed2)];

      case "ixseek":
      case "ixscan":
        // ixseek s1 s2 s6 s3 s4 s5 [] @"..." @"..." true
        // First two slots are seek bounds (consumed), rest are produced
        const ixTokens = details.split(/\s+/);
        const seekSlots = ixTokens.filter((t) => /^s\d+$/.exec(t)).slice(0, 2);
        return seekSlots;

      case "seek":
        // seek s3 s8 s9 s4 s5 s6 s7 none none [s10 = summary] @"..." true false
        // First slot is RecordId to seek (consumed)
        const seekTokens = details.split(/\s+/);
        const firstSlot = seekTokens.find((t) => /^s\d+$/.exec(t));
        return firstSlot ? [firstSlot] : [];

      case "scan":
        // scan none none none none [] @"collection" true false
        // Collection scans typically don't consume slots from other stages
        return [];

      case "filter":
      case "cfilter":
        // filter {(exists(s1) && exists(s2))}
        // Consumes slots referenced in filter expression
        const filterSlots = details.matchAll(/s(\d+)/g);
        return Array.from(filterSlots, (match) => `s${match[1]}`);

      case "sort":
        // sort [s11] [asc] [s8]
        // Consumes sort keys and values
        const sortBrackets = details.matchAll(/\[([^\]]+)\]/g);
        const sortConsumed: string[] = [];
        for (const bracket of sortBrackets) {
          if (bracket[1]) {
            const slots = bracket[1].match(/s\d+/g);
            if (slots) sortConsumed.push(...slots);
          }
        }
        return sortConsumed;

      case "nlj":
      case "loop_join":
        // nlj inner [] [s3, s4, s5, s6, s7]
        // First bracket: correlated slots from outer side
        // Second bracket: output slots (we want the first bracket for consumed)
        const nljBrackets = details.matchAll(/\[([^\]]*)\]/g);
        const bracketsArray = Array.from(nljBrackets);
        if (bracketsArray.length >= 1 && bracketsArray[0]?.[1]?.trim()) {
          // First bracket contains correlated slots (consumed)
          return bracketsArray[0][1]
            .split(/[\s,]+/)
            .filter((s) => s.startsWith("s"));
        }
        return []; // Empty first bracket means no correlated slots

      case "limit":
        // limit 1ll
        // Passes through data, doesn't consume specific slots
        return [];

      case "unwind":
        // unwind s5 s10 s11 false
        // Consumes array slot (first slot)
        const unwindTokens = details.split(/\s+/);
        const arraySlot = unwindTokens.find((t) => /^s\d+$/.exec(t));
        return arraySlot ? [arraySlot] : [];

      case "branch":
        // branch {s21} [output slots]
        // Consumes condition slot
        const conditionMatch = /\{(s\d+)\}/.exec(details);
        return conditionMatch?.[1] ? [conditionMatch[1]] : [];
    }

    // Fallback: try to extract slots from expressions and function calls
    const expressionSlots = details.matchAll(/\(([s\d\s,]+)\)/g);
    const fallbackConsumed: string[] = [];
    for (const match of expressionSlots) {
      if (!match[1]) continue;
      const slots = match[1].split(/[\s,]+/).filter((s) => s.startsWith("s"));
      fallbackConsumed.push(...slots);
    }
    return [...new Set(fallbackConsumed)];
  }

  /**
   * Determine which slots a stage produces (writes)
   * Based on SBE stage output slot conventions
   */
  private static getProducedSlots(stage: SBEStage): string[] {
    const details = stage.details;

    switch (stage.stageType) {
      case "project":
        // project [s16 = doubleDoubleSumFinalize (s14), s17 = getField(s10, "name")]
        // Produces slots on left side of assignments
        const projectSlots = details.matchAll(/\[(.*?)\]/g);
        const produced: string[] = [];
        for (const bracketMatch of projectSlots) {
          if (!bracketMatch[1]) continue;
          const assignments = bracketMatch[1].split(",");
          for (const assignment of assignments) {
            const assignMatch = /(s\d+)\s*=/.exec(assignment);
            if (assignMatch?.[1]) produced.push(assignMatch[1]);
          }
        }
        return produced;

      case "mkobj":
      case "mkbson":
        // mkobj s17 [_id = s12, total = s16]
        // First slot after stage name is output object slot
        const objTokens = details.split(/\s+/);
        const objSlot = objTokens[0]?.match(/^s\d+$/);
        return objSlot ? [objTokens[0]!] : [];

      case "group":
      case "hash_agg":
        // group [s12] [s14 = aggDoubleDoubleSum (s13), s15 = count()]
        // Produces slots from aggregation assignments
        const groupRegex = /\[([^\]]+)\]\s*\[([^\]]+)\]/;
        const groupMatch = groupRegex.exec(details);
        if (groupMatch?.[2]) {
          const aggAssignments = groupMatch[2];
          const aggSlots = aggAssignments.matchAll(/(s\d+)\s*=/g);
          return Array.from(aggSlots)
            .map((match) => match[1])
            .filter((slot): slot is string => slot !== undefined);
        }
        return [];

      case "ixseek":
      case "ixscan":
        // ixseek s1 s2 s6 s3 s4 s5 [] @"..." @"..." true
        // Slot pattern: seekLow seekHigh indexKeySlot recordIdSlot snapshotIdSlot indexIdentSlot
        // Produces: recordIdSlot, indexKeySlot, snapshotIdSlot, indexIdentSlot
        const ixTokens = details.split(/\s+/);
        const ixSlots = ixTokens.filter((t) => /^s\d+$/.exec(t));
        // Skip first two (seek bounds), rest are outputs
        return ixSlots.slice(2);

      case "seek":
        // seek s3 s8 s9 s4 s5 s6 s7 none none [s10 = summary] @"..." true false
        // Slot pattern: recordIdIn recordOut recordIdOut snapshotId indexId indexKey indexKeyPattern ...
        // Produces: recordOut, recordIdOut, and projected fields
        const seekTokens = details.split(/\s+/);
        const seekSlots = seekTokens.filter((t) => /^s\d+$/.exec(t));
        const produced2: string[] = [];

        // recordOut is typically second slot, recordIdOut is third
        if (seekSlots.length >= 2) produced2.push(seekSlots[1]!);
        if (seekSlots.length >= 3) produced2.push(seekSlots[2]!);

        // Add projected fields from bracket notation
        const projectionMatch = /\[([^\]]+)\]/.exec(details);
        if (projectionMatch?.[1]) {
          const projSlots = projectionMatch[1].matchAll(/(s\d+)\s*=/g);
          produced2.push(
            ...Array.from(projSlots)
              .map((match) => match[1])
              .filter((slot): slot is string => slot !== undefined),
          );
        }
        return produced2;

      case "scan":
        // scan none none none none [] @"collection" true false
        // scan seekRecordIdSlot recordSlot recordIdSlot snapshotIdSlot indexIdSlot
        const scanTokens = details.split(/\s+/);
        const scanSlots = scanTokens.filter((t) => /^s\d+$/.exec(t));
        // Typically produces record and recordId slots
        return scanSlots.length >= 2
          ? [scanSlots[1]!, scanSlots[2]!]
          : scanSlots;

      case "filter":
      case "cfilter":
        // filter {expression}
        // Filters don't produce new slots, they pass through existing ones
        return [];

      case "sort":
        // sort [s11] [asc] [s8]
        // Produces sorted values (last bracket)
        const sortBrackets = details.matchAll(/\[([^\]]+)\]/g);
        const sortBracketArray = Array.from(sortBrackets);
        if (sortBracketArray.length >= 3) {
          const sortMatch = sortBracketArray[2];
          if (!sortMatch?.[1]) return [];
          return sortMatch[1]?.match(/s\d+/g) ?? [];
        }
        return [];

      case "nlj":
      case "loop_join":
        // nlj inner [] [s3, s4, s5, s6, s7]
        // Second bracket contains output slots
        const nljOutBrackets = details.matchAll(/\[([^\]]*)\]/g);
        const nljOutArray = Array.from(nljOutBrackets);
        if (nljOutArray.length >= 2) {
          // Second bracket contains output slots
          const nljMatch = nljOutArray[1];
          if (!nljMatch?.[1]) return [];
          return nljMatch[1].split(/[\s,]+/).filter((s) => s.startsWith("s"));
        }
        return [];

      case "limit":
        // limit 1ll
        // Passes through existing slots without creating new ones
        return [];

      case "unwind":
        // unwind s5 s10 s11 false
        // Slot pattern: arraySlot elementSlot indexSlot preserveNullAndEmpty
        // Produces: elementSlot, indexSlot (optional)
        const unwindTokens = details.split(/\s+/);
        const unwindSlots = unwindTokens.filter((t) => /^s\d+$/.exec(t));
        return unwindSlots.length >= 2 ? unwindSlots.slice(1) : [];

      case "branch":
        // branch {s21} [s16, s17, s18, s19, s20]
        // Produces output slots based on which branch executes
        const outputBracket = /\[([s\d\s,]+)\]/.exec(details);
        if (outputBracket?.[1]) {
          return outputBracket[1]
            .split(/[\s,]+/)
            .filter((s) => s.startsWith("s"));
        }
        return [];
    }

    // Fallback: look for assignment patterns
    const assignmentSlots = details.matchAll(/(s\d+)\s*=/g);
    const fallbackProduced = Array.from(assignmentSlots)
      .map((match) => match[1])
      .filter((slot): slot is string => slot !== undefined);

    if (fallbackProduced.length > 0) {
      return fallbackProduced;
    }

    // Last resort: if no assignments found, check if first slot reference might be output
    // This is risky but better than returning empty for unknown stages
    const firstSlot = stage.slotReferences[0];
    return firstSlot ? [firstSlot] : [];
  }

  /**
   * Calculate complexity level of a stage
   */
  private static calculateComplexity(stage: SBEStage): SBEComplexityLevel {
    const slotCount = stage.slotReferences.length;
    const hasChildren = stage.children.length > 0;

    if (slotCount <= 2 && !hasChildren) return "simple";
    if (slotCount <= 4 && stage.children.length <= 2) return "moderate";
    if (slotCount <= 8 || stage.children.length <= 4) return "complex";
    return "very_complex";
  }

  /**
   * Extract queryPlan stage names and map them by planNodeId
   */
  private static extractQueryPlanStages(
    queryPlan: unknown,
  ): Map<number, string> {
    const stages = new Map<number, string>();

    const traverse = (stage: unknown) => {
      if (!stage || typeof stage !== "object") return;

      const stageObj = stage as Record<string, unknown>;

      if (
        typeof stageObj.planNodeId === "number" &&
        typeof stageObj.stage === "string"
      ) {
        stages.set(stageObj.planNodeId, stageObj.stage);
      }

      // Traverse nested stages
      if (stageObj.inputStage && typeof stageObj.inputStage === "object") {
        traverse(stageObj.inputStage);
      }

      if (Array.isArray(stageObj.inputStages)) {
        for (const inputStage of stageObj.inputStages) {
          traverse(inputStage);
        }
      }
    };

    traverse(queryPlan);
    return stages;
  }

  /**
   * Extract execution statistics from executionStages hierarchy
   */
  private static extractExecutionStats(
    executionStages: unknown,
  ): Map<number, SBEStageExecutionStats[]> {
    const statsMap = new Map<number, SBEStageExecutionStats[]>();
    this.walkExecutionStages(executionStages, statsMap);
    return statsMap;
  }

  /**
   * Recursively walk executionStages hierarchy and extract stats
   */
  private static walkExecutionStages(
    stage: unknown,
    statsMap: Map<number, SBEStageExecutionStats[]>,
    path = "",
  ): void {
    if (!stage || typeof stage !== "object") return;

    const stageObj = stage as Record<string, unknown>;
    const planNodeId = this.getNumeric(stageObj, "planNodeId");

    if (planNodeId !== null) {
      const stats = this.extractStageStats(stageObj, path);

      if (!statsMap.has(planNodeId)) {
        statsMap.set(planNodeId, []);
      }
      statsMap.get(planNodeId)!.push(stats);
    }

    // Recursively process nested stages
    this.processNestedStages(stageObj, statsMap, path);
  }

  /**
   * Extract comprehensive stats from a single execution stage
   */
  private static extractStageStats(
    stageObj: Record<string, unknown>,
    path: string,
  ): SBEStageExecutionStats {
    const stageName = this.getString(stageObj, "stage") ?? "unknown";
    const planNodeId = this.getNumeric(stageObj, "planNodeId") ?? 0;

    return {
      stageName,
      planNodeId,
      path,

      // Core execution metrics
      coreMetrics: {
        nReturned: this.getNumeric(stageObj, "nReturned") ?? 0,
        executionTimeMillisEstimate:
          this.getNumeric(stageObj, "executionTimeMillisEstimate") ?? 0,
        opens: this.getNumeric(stageObj, "opens") ?? 0,
        closes: this.getNumeric(stageObj, "closes") ?? 0,
        saveState: this.getNumeric(stageObj, "saveState") ?? 0,
        restoreState: this.getNumeric(stageObj, "restoreState") ?? 0,
        isEOF: this.getNumeric(stageObj, "isEOF") ?? 0,
      },

      // Index operation metrics
      indexStats: this.extractIndexStats(stageObj),

      // Collection operation metrics
      collectionStats: {
        totalDocsExamined:
          this.getNumeric(stageObj, "totalDocsExamined") ?? undefined,
        totalKeysExamined:
          this.getNumeric(stageObj, "totalKeysExamined") ?? undefined,
        collectionScans:
          this.getNumeric(stageObj, "collectionScans") ?? undefined,
        collectionSeeks:
          this.getNumeric(stageObj, "collectionSeeks") ?? undefined,
        indexScans: this.getNumeric(stageObj, "indexScans") ?? undefined,
        indexSeeks: this.getNumeric(stageObj, "indexSeeks") ?? undefined,
        numReads: this.getNumeric(stageObj, "numReads") ?? undefined,
      },

      // Branch-specific metrics
      branchStats: this.extractBranchStats(stageObj),

      // Slot mappings
      slotMappings: this.extractSlotMappings(stageObj),

      // Projections and expressions
      projections: this.extractProjections(stageObj),

      // Performance analysis
      performanceLevel: this.calculatePerformanceLevel(stageObj),

      // Stage-specific details
      stageSpecificData: this.extractStageSpecificData(stageName, stageObj),
    };
  }

  /**
   * Extract index-related statistics
   */
  private static extractIndexStats(
    stageObj: Record<string, unknown>,
  ): SBEIndexStats | null {
    const indexName = this.getString(stageObj, "indexName");
    if (!indexName) return null;

    return {
      indexName,
      keysExamined: this.getNumeric(stageObj, "keysExamined") ?? 0,
      seeks: this.getNumeric(stageObj, "seeks") ?? 0,
      numReads: this.getNumeric(stageObj, "numReads") ?? 0,
      keyCheckSkipped:
        this.getNumeric(stageObj, "keyCheckSkipped") ?? undefined,
      indexesUsed: this.getStringArray(stageObj, "indexesUsed") ?? [],
      indexKeySlot: this.getNumeric(stageObj, "indexKeySlot") ?? undefined,
      recordIdSlot: this.getNumeric(stageObj, "recordIdSlot") ?? undefined,
      snapshotIdSlot: this.getNumeric(stageObj, "snapshotIdSlot") ?? undefined,
      indexIdentSlot: this.getNumeric(stageObj, "indexIdentSlot") ?? undefined,
      seekKeyLow: this.getString(stageObj, "seekKeyLow") ?? undefined,
      seekKeyHigh: this.getString(stageObj, "seekKeyHigh") ?? undefined,
    };
  }

  /**
   * Extract branch-specific statistics
   */
  private static extractBranchStats(
    stageObj: Record<string, unknown>,
  ): SBEBranchStats | null {
    if (this.getString(stageObj, "stage") !== "branch") return null;

    return {
      numTested: this.getNumeric(stageObj, "numTested") ?? 0,
      thenBranchOpens: this.getNumeric(stageObj, "thenBranchOpens") ?? 0,
      thenBranchCloses: this.getNumeric(stageObj, "thenBranchCloses") ?? 0,
      elseBranchOpens: this.getNumeric(stageObj, "elseBranchOpens") ?? 0,
      elseBranchCloses: this.getNumeric(stageObj, "elseBranchCloses") ?? 0,
      filter: this.getString(stageObj, "filter") ?? undefined,
      thenSlots: this.getNumericArray(stageObj, "thenSlots") ?? [],
      elseSlots: this.getNumericArray(stageObj, "elseSlots") ?? [],
      outputSlots: this.getNumericArray(stageObj, "outputSlots") ?? [],
    };
  }

  /**
   * Extract slot mappings for the stage
   */
  private static extractSlotMappings(
    stageObj: Record<string, unknown>,
  ): Record<string, number> {
    const mappings: Record<string, number> = {};

    // Common slot fields
    const slotFields = [
      "indexKeySlot",
      "recordIdSlot",
      "snapshotIdSlot",
      "indexIdentSlot",
      "inputSlot",
      "outSlot",
      "outIndexSlot",
      "recordSlot",
      "recordIdSlot",
      "seekRecordIdSlot",
      "orderBySlots",
    ];

    for (const field of slotFields) {
      const value = this.getNumeric(stageObj, field);
      if (value !== null) {
        mappings[field] = value;
      }
    }

    return mappings;
  }

  /**
   * Extract projection expressions
   */
  private static extractProjections(
    stageObj: Record<string, unknown>,
  ): Record<string, string> {
    const projections = stageObj.projections;
    if (!projections || typeof projections !== "object") return {};

    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(projections)) {
      if (typeof value === "string") {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Calculate performance level based on stage metrics
   */
  private static calculatePerformanceLevel(
    stageObj: Record<string, unknown>,
  ): SBEPerformanceLevel {
    const nReturned = this.getNumeric(stageObj, "nReturned") ?? 0;
    const opens = this.getNumeric(stageObj, "opens") ?? 0;
    const keysExamined = this.getNumeric(stageObj, "keysExamined") ?? 0;
    const keyCheckSkipped = this.getNumeric(stageObj, "keyCheckSkipped") ?? 0;

    // Stage is inactive if no opens
    if (opens === 0) return "inactive";

    // Very efficient if high key skip ratio
    if (keysExamined > 0 && keyCheckSkipped > 0) {
      const skipRatio = keyCheckSkipped / keysExamined;
      if (skipRatio > 0.9) return "excellent";
      if (skipRatio > 0.7) return "good";
    }

    // Check opens to returns ratio for efficiency
    if (nReturned > 0 && opens > 0) {
      const efficiency = nReturned / opens;
      if (efficiency > 0.8) return "good";
      if (efficiency > 0.5) return "moderate";
      return "poor";
    }

    return "unknown";
  }

  /**
   * Extract stage-specific additional data
   */
  private static extractStageSpecificData(
    stageName: string,
    stageObj: Record<string, unknown>,
  ): Record<string, unknown> {
    const specific: Record<string, unknown> = {};

    switch (stageName) {
      case "nlj":
        specific.innerOpens = this.getNumeric(stageObj, "innerOpens");
        specific.innerCloses = this.getNumeric(stageObj, "innerCloses");
        specific.outerProjects = this.getArray(stageObj, "outerProjects");
        specific.outerCorrelated = this.getNumericArray(
          stageObj,
          "outerCorrelated",
        );
        break;

      case "limit":
        specific.limit = this.getNumeric(stageObj, "limit");
        break;

      case "sort":
        specific.memLimit = this.getNumeric(stageObj, "memLimit");
        specific.totalDataSizeSorted = this.getNumeric(
          stageObj,
          "totalDataSizeSorted",
        );
        specific.usedDisk = this.getBoolean(stageObj, "usedDisk");
        specific.spills = this.getNumeric(stageObj, "spills");
        specific.spilledDataStorageSize = this.getNumeric(
          stageObj,
          "spilledDataStorageSize",
        );
        specific.orderBySlots = stageObj.orderBySlots;
        break;

      case "unwind":
        specific.inputSlot = this.getNumeric(stageObj, "inputSlot");
        specific.outSlot = this.getNumeric(stageObj, "outSlot");
        specific.outIndexSlot = this.getNumeric(stageObj, "outIndexSlot");
        specific.preserveNullAndEmptyArrays = this.getNumeric(
          stageObj,
          "preserveNullAndEmptyArrays",
        );
        break;

      case "seek":
        specific.recordSlot = this.getNumeric(stageObj, "recordSlot");
        specific.recordIdSlot = this.getNumeric(stageObj, "recordIdSlot");
        specific.seekRecordIdSlot = this.getNumeric(
          stageObj,
          "seekRecordIdSlot",
        );
        specific.scanFieldNames = this.getStringArray(
          stageObj,
          "scanFieldNames",
        );
        specific.scanFieldSlots = this.getNumericArray(
          stageObj,
          "scanFieldSlots",
        );
        break;

      case "unique":
        specific.dupsTested = this.getNumeric(stageObj, "dupsTested");
        specific.dupsDropped = this.getNumeric(stageObj, "dupsDropped");
        specific.keySlots = this.getNumericArray(stageObj, "keySlots");
        break;
    }

    return specific;
  }

  /**
   * Process nested stages (inputStage, innerStage, outerStage, etc.)
   */
  private static processNestedStages(
    stageObj: Record<string, unknown>,
    statsMap: Map<number, SBEStageExecutionStats[]>,
    path: string,
  ): void {
    // Single nested stages
    const nestedStageFields = [
      "inputStage",
      "innerStage",
      "outerStage",
      "thenStage",
      "elseStage",
    ];

    for (const field of nestedStageFields) {
      const nestedStage = stageObj[field];
      if (nestedStage && typeof nestedStage === "object") {
        this.walkExecutionStages(nestedStage, statsMap, `${path}.${field}`);
      }
    }

    // Array of nested stages
    const inputStages = stageObj.inputStages;
    if (Array.isArray(inputStages)) {
      inputStages.forEach((stage, index) => {
        this.walkExecutionStages(
          stage,
          statsMap,
          `${path}.inputStages[${index}]`,
        );
      });
    }
  }

  // Utility methods for safe property extraction
  private static getString(
    obj: Record<string, unknown>,
    key: string,
  ): string | null {
    const value = obj[key];
    return typeof value === "string" ? value : null;
  }

  private static getNumeric(
    obj: Record<string, unknown>,
    key: string,
  ): number | null {
    const value = obj[key];
    return typeof value === "number" ? value : null;
  }

  private static getBoolean(
    obj: Record<string, unknown>,
    key: string,
  ): boolean | null {
    const value = obj[key];
    return typeof value === "boolean" ? value : null;
  }

  private static getArray(
    obj: Record<string, unknown>,
    key: string,
  ): unknown[] | null {
    const value = obj[key];
    return Array.isArray(value) ? value : null;
  }

  private static getStringArray(
    obj: Record<string, unknown>,
    key: string,
  ): string[] | null {
    const value = obj[key];
    if (!Array.isArray(value)) return null;
    return value.filter((item): item is string => typeof item === "string");
  }

  private static getNumericArray(
    obj: Record<string, unknown>,
    key: string,
  ): number[] | null {
    const value = obj[key];
    if (!Array.isArray(value)) return null;
    return value.filter((item): item is number => typeof item === "number");
  }
}
