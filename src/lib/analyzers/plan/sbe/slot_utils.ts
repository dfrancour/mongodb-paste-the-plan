/**
 * SBE Slot Analysis Utilities
 *
 * Tracks how slots flow through SBE stages:
 * - Where each slot is created
 * - How slots are transformed
 * - Which stages consume which slots
 * - Inferred field meanings from getField operations
 */

import type {
  SBEStage,
  SBESlotEnvironment,
  SlotLineage,
  SlotDefinition,
  SlotUsage,
  SlotUsagePurpose,
  SBESlotTransformation,
  SBESlotTrace,
} from "#types/explain-plan";

/**
 * Build complete slot lineages from SBE stages
 */
export function buildSlotLineages(
  stages: SBEStage[],
  environment: SBESlotEnvironment,
): SlotLineage[] {
  const lineages: SlotLineage[] = [];
  const definitions = findSlotDefinitions(stages, environment);
  const usages = findSlotUsages(stages);
  const transformations = extractTransformations(stages);

  for (const definition of definitions) {
    const slotUsages = usages.filter(
      (usage) => usage.slotId === definition.slotId,
    );
    const slotTransformations = transformations.filter(
      (t) =>
        t.inputSlots.includes(definition.slotId) ||
        t.outputSlots.includes(definition.slotId),
    );

    const lineage: SlotLineage = {
      slotId: definition.slotId,
      definition,
      usages: slotUsages,
      transformations: slotTransformations,
      descendants: findDescendants(definition.slotId, transformations),
      ancestors: findAncestors(definition.slotId, transformations),
      inferredMeaning: inferSlotMeaning(
        definition,
        slotUsages,
        slotTransformations,
      ),
    };

    lineages.push(lineage);
  }

  return lineages;
}

/**
 * Generate a complete slot trace for debugging
 */
export function generateSlotTrace(
  slotId: string,
  lineages: SlotLineage[],
): SBESlotTrace | null {
  const lineage = lineages.find((l) => l.slotId === slotId);
  if (!lineage) return null;

  return {
    slotId,
    createdBy: lineage.definition.createdAt,
    transformations: lineage.transformations,
    finalUsage:
      lineage.usages
        .filter((u) => u.operation === "input")
        .map((u) => u.usedAt)
        .join(", ") || "unused",
    inferredMeaning: lineage.inferredMeaning,
  };
}

/**
 * Find all slot definitions across stages
 */
function findSlotDefinitions(
  stages: SBEStage[],
  environment: SBESlotEnvironment,
): SlotDefinition[] {
  const definitions: SlotDefinition[] = [];

  // Add environment slots
  for (const [slotId, slotInfo] of Object.entries(environment.slots)) {
    definitions.push({
      slotId,
      createdAt: "environment",
      slotType: slotInfo.type,
      initialValue: slotInfo.value,
      fieldOrigin: undefined,
    });
  }

  // Add slots created by stages
  const allStages = flattenStages(stages);
  for (const stage of allStages) {
    const producedSlots = getProducedSlots(stage);

    for (const slotId of producedSlots) {
      const fieldOrigin = extractFieldOrigin(stage, slotId);

      definitions.push({
        slotId,
        createdAt: `${stage.stageType}_${stage.nodeId}`,
        slotType: inferSlotTypeFromStage(stage, slotId),
        fieldOrigin,
      });
    }
  }

  return definitions;
}

/**
 * Find all slot usages across stages
 */
function findSlotUsages(stages: SBEStage[]): SlotUsage[] {
  const usages: SlotUsage[] = [];
  const allStages = flattenStages(stages);

  for (const stage of allStages) {
    const consumedSlots = getConsumedSlots(stage);
    const producedSlots = getProducedSlots(stage);

    // Track consumed slots
    for (const slotId of consumedSlots) {
      usages.push({
        slotId,
        usedAt: `${stage.stageType}_${stage.nodeId}`,
        operation: "input",
        purpose: inferSlotPurpose(stage, slotId, "input"),
      });
    }

    // Track produced slots
    for (const slotId of producedSlots) {
      usages.push({
        slotId,
        usedAt: `${stage.stageType}_${stage.nodeId}`,
        operation: "output",
        purpose: inferSlotPurpose(stage, slotId, "output"),
      });
    }
  }

  return usages;
}

/**
 * Extract transformations between slots
 */
function extractTransformations(stages: SBEStage[]): SBESlotTransformation[] {
  const transformations: SBESlotTransformation[] = [];
  const allStages = flattenStages(stages);

  for (const stage of allStages) {
    const inputSlots = getConsumedSlots(stage);
    const outputSlots = getProducedSlots(stage);

    if (inputSlots.length > 0 || outputSlots.length > 0) {
      transformations.push({
        stageId: `${stage.stageType}_${stage.nodeId}`,
        stageType: stage.stageType,
        operation: getTransformationOperation(stage),
        inputSlots,
        outputSlots,
      });
    }
  }

  return transformations;
}

/**
 * Get transformation operation description
 */
function getTransformationOperation(stage: SBEStage): string {
  const details = stage.details;

  switch (stage.stageType) {
    case "project":
      const projectRegex = /\[([^=]+)=\s*([^[]+)/;
      const projectMatch = projectRegex.exec(details);
      return projectMatch?.[1] && projectMatch?.[2]
        ? `${projectMatch[1].trim()} = ${projectMatch[2].trim()}`
        : "projection";

    case "mkobj":
      return "create object";

    case "mkbson":
      return "create BSON document";

    case "group":
      return "group aggregation";

    case "ixseek":
      return "index seek";

    case "nlj":
      return "nested loop join";

    case "limit":
      return "limit results";

    case "coscan":
      return "collection scan";

    default:
      return stage.stageType;
  }
}

/**
 * Find descendant slots (slots created from this slot)
 */
function findDescendants(
  slotId: string,
  transformations: SBESlotTransformation[],
): string[] {
  const descendants: string[] = [];

  for (const transformation of transformations) {
    if (transformation.inputSlots.includes(slotId)) {
      descendants.push(...transformation.outputSlots);
    }
  }

  return [...new Set(descendants)];
}

/**
 * Find ancestor slots (slots that contributed to creating this slot)
 */
function findAncestors(
  slotId: string,
  transformations: SBESlotTransformation[],
): string[] {
  const ancestors: string[] = [];

  for (const transformation of transformations) {
    if (transformation.outputSlots.includes(slotId)) {
      ancestors.push(...transformation.inputSlots);
    }
  }

  return [...new Set(ancestors)];
}

/**
 * Infer the meaning/purpose of a slot
 */
function inferSlotMeaning(
  definition: SlotDefinition,
  usages: SlotUsage[],
  transformations: SBESlotTransformation[],
): string {
  // Check if field origin is known
  if (definition.fieldOrigin) {
    return `field: ${definition.fieldOrigin}`;
  }

  // Check for environment slots
  if (definition.createdAt === "environment") {
    if (definition.initialValue?.includes("CLUSTER_TIME"))
      return "cluster timestamp";
    if (definition.initialValue?.includes("timeZoneDB"))
      return "timezone database";
    if (definition.initialValue?.includes("NOW")) return "current timestamp";
    if (definition.initialValue === "Nothing") return "search metadata";
  }

  // Infer from stage usage patterns
  const creationTransformation = transformations.find((t) =>
    t.outputSlots.includes(definition.slotId),
  );

  if (creationTransformation?.operation) {
    switch (creationTransformation.stageType) {
      case "group":
        if (creationTransformation.operation.includes("aggDoubleDoubleSum")) {
          return "sum aggregation result";
        }
        if (creationTransformation.operation.includes("group")) {
          return "group key";
        }
        break;

      case "project":
        if (creationTransformation.operation.includes("getField")) {
          const fieldRegex = /getField\s*\([^,]+,\s*"([^"]+)"/;
          const fieldMatch = fieldRegex.exec(creationTransformation.operation);
          if (fieldMatch) {
            return `field: ${fieldMatch[1]}`;
          }
        }
        if (creationTransformation.operation.includes("fillEmpty")) {
          return "null-safe field access";
        }
        if (creationTransformation.operation.includes("Finalize")) {
          return "finalized aggregation";
        }
        break;

      case "mkobj":
      case "mkbson":
        return "document construction";

      case "ixseek":
        return "index scan result";
    }
  }

  // Infer from usage pattern
  const outputUsages = usages.filter((u) => u.operation === "output");
  const inputUsages = usages.filter((u) => u.operation === "input");

  if (outputUsages.length === 1 && inputUsages.length === 0) {
    return "source data";
  }

  if (outputUsages.length === 0 && inputUsages.length === 1) {
    return "final result";
  }

  if (inputUsages.length > outputUsages.length) {
    return "intermediate value";
  }

  return "unknown purpose";
}

/**
 * Infer slot purpose within a specific stage
 */
function inferSlotPurpose(
  stage: SBEStage,
  slotId: string,
  operation: "input" | "output",
): SlotUsagePurpose {
  switch (stage.stageType) {
    case "group":
      if (operation === "input") {
        // Check if it's a group-by key or aggregation input
        if (
          stage.details.includes(`[${slotId}]`) ||
          stage.details.includes(`[s12]`)
        ) {
          return "grouping";
        }
        return "aggregation";
      }
      return "output";

    case "project":
      if (operation === "input") {
        if (stage.details.includes("getField")) return "projection";
        if (stage.details.includes("Finalize")) return "aggregation";
        return "filter";
      }
      return "output";

    case "mkobj":
    case "mkbson":
      if (operation === "input") return "projection";
      return "output";

    case "ixseek":
      if (operation === "input") return "filter";
      return "output";

    default:
      if (operation === "input") return "input";
      return "output";
  }
}

/**
 * Flatten nested stages into a single array
 */
function flattenStages(stages: SBEStage[]): SBEStage[] {
  const flattened: SBEStage[] = [];

  for (const stage of stages) {
    flattened.push(stage);
    if (stage.children.length > 0) {
      flattened.push(...flattenStages(stage.children));
    }
  }

  return flattened;
}

/**
 * Extract field origin from getField operations
 */
function extractFieldOrigin(
  stage: SBEStage,
  slotId: string,
): string | undefined {
  if (stage.stageType === "project") {
    // Look for: project [s13 = getField (s10, "transaction_count")]
    const getFieldRegex = new RegExp(
      `\\[${slotId}\\s*=\\s*getField\\s*\\([^,]+,\\s*"([^"]+)"`,
    );
    const getFieldMatch = getFieldRegex.exec(stage.details);
    return getFieldMatch?.[1];
  }
  return undefined;
}

/**
 * Infer slot type from stage context
 */
function inferSlotTypeFromStage(stage: SBEStage, _slotId: string) {
  switch (stage.stageType) {
    case "project":
      if (stage.details.includes("getField")) return "field_path";
      if (stage.details.includes("Finalize")) return "expression";
      return "expression";

    case "mkobj":
    case "mkbson":
      return "expression";

    case "group":
      return "expression";

    case "ixseek":
      return "value_list";

    default:
      return "unknown";
  }
}

/**
 * Extract consumed slots from stage
 */
function getConsumedSlots(stage: SBEStage): string[] {
  const details = stage.details;

  switch (stage.stageType) {
    case "project":
      const projectRegex = /\[([^=]+)=\s*[^(]*\(([s\d\s,]+)\)/;
      const projectMatch = projectRegex.exec(details);
      if (projectMatch?.[2]) {
        return projectMatch[2].split(/[\s,]+/).filter((s) => s.startsWith("s"));
      }
      break;

    case "mkobj":
      const mkobjRegex = /\[([^=\]]+=[^,\]]+(?:,\s*[^=\]]+=[^,\]]+)*)\]/;
      const mkobjMatch = mkobjRegex.exec(details);
      if (mkobjMatch?.[1]) {
        const assignments = mkobjMatch[1];
        const slotMatches = assignments.matchAll(/=\s*(s\d+)/g);
        return Array.from(slotMatches, (match) => match[1]).filter(
          (slot): slot is string => Boolean(slot),
        );
      }
      break;

    case "group":
      const groupRegex = /\[([^\]]+)\]\s*\[([^\]]+)\]/;
      const groupMatch = groupRegex.exec(details);
      if (groupMatch?.[1] && groupMatch[2]) {
        const groupBy = groupMatch[1];
        const aggregation = groupMatch[2];
        const consumed: string[] = [];

        const groupSlots = groupBy.matchAll(/s\d+/g);
        consumed.push(
          ...Array.from(groupSlots, (match) => match[0]).filter(Boolean),
        );

        const aggRegex = /\(([s\d\s,]+)\)/;
        const aggMatch = aggRegex.exec(aggregation);
        if (aggMatch?.[1]) {
          const aggSlots = aggMatch[1]
            .split(/[\s,]+/)
            .filter((s) => s.startsWith("s"));
          consumed.push(...aggSlots);
        }

        return consumed;
      }
      break;
  }

  return stage.slotReferences.slice(1);
}

/**
 * Extract produced slots from stage
 */
function getProducedSlots(stage: SBEStage): string[] {
  const details = stage.details;

  switch (stage.stageType) {
    case "project":
      const projectRegex = /\[(\w+)\s*=/;
      const projectMatch = projectRegex.exec(details);
      return projectMatch?.[1] ? [projectMatch[1]] : [];

    case "mkobj":
    case "mkbson":
      const outputRegex = /^(\w+)\s/;
      const outputMatch = outputRegex.exec(details);
      return outputMatch?.[1] ? [outputMatch[1]] : [];

    case "group":
      const groupRegex = /\[([^\]]+)\]\s*\[(\w+)\s*=/;
      const groupMatch = groupRegex.exec(details);
      return groupMatch?.[2] ? [groupMatch[2]] : [];

    case "ixseek":
      const ixseekRegex = /\[([^\]]+)\]/;
      const ixseekMatch = ixseekRegex.exec(details);
      if (ixseekMatch?.[1]) {
        const outputs = ixseekMatch[1].matchAll(/(\w+)\s*=/g);
        return Array.from(outputs, (match) => match[1]).filter(
          (slot): slot is string => Boolean(slot),
        );
      }
      break;
  }

  return stage.slotReferences.length > 0 ? [stage.slotReferences[0]!] : [];
}
