import type { FlowStage } from "#types/flow-visualization";
import type { NormalizedStage } from "#types/explain-plan";
import {
  hasExplainFields,
  getFieldsForStage,
} from "#data/stages/fields/field_utilities";

/**
 * Minimal stage data needed for node height calculation.
 * Accepts both NormalizedStage (from layout engine) and FlowStage (from components).
 */
type NodeSizingStage = NormalizedStage & {
  readonly sbeData?: FlowStage["sbeData"];
  readonly aggregationData?: FlowStage["aggregationData"];
};

/** Helper to safely access metrics from a possibly plan-only stage */
function getMetrics(stage: NormalizedStage) {
  return stage.metrics ?? {};
}

/**
 * Determine performance icon based on execution time
 */
export function getPerformanceIcon(executionTimeMillis?: number): {
  iconName: string;
  colorClass: string;
} {
  if (!executionTimeMillis) {
    return {
      iconName: "Zap",
      colorClass: "text-neutral-600 dark:text-neutral-400",
    };
  }

  if (executionTimeMillis > 1000) {
    return {
      iconName: "AlertCircle",
      colorClass: "text-red-600 dark:text-red-400",
    };
  }

  if (executionTimeMillis >= 100) {
    return {
      iconName: "AlertTriangle",
      colorClass: "text-orange-600 dark:text-orange-400",
    };
  }

  return {
    iconName: "Zap",
    colorClass: "text-neutral-600 dark:text-neutral-400",
  };
}

/**
 * Get performance-based styling classes for the node container
 */
export function getPerformanceContainerClasses(isHighlighted: boolean): string {
  const baseClasses = "rounded-lg transition-all duration-200";
  const hoverClasses = "hover:shadow-lg";
  const highlightClasses = isHighlighted
    ? "ring-2 ring-neutral-400 ring-opacity-50"
    : "";

  return `${baseClasses} border-2 border-neutral-300 dark:border-neutral-600 ${hoverClasses} ${highlightClasses} bg-neutral-50 dark:bg-neutral-800`;
}

/**
 * Format metric value with proper fallback
 */
export function formatMetricValue(value: number | undefined): string {
  return value?.toLocaleString() ?? "—";
}

/**
 * Truncate JSON display with ellipsis
 */
export function truncateJsonDisplay(
  jsonString: string,
  maxLength = 40,
): string {
  return jsonString.length > maxLength
    ? `${jsonString.slice(0, maxLength)}...`
    : jsonString;
}

/**
 * Intelligent truncation for index names
 */
export function truncateIndexName(indexName: string, maxLength = 35): string {
  if (indexName.length <= maxLength) return indexName;

  // For compound indexes, try to preserve the most important parts
  if (indexName.includes("_")) {
    const parts = indexName.split("_");
    const sortInfo = parts.pop(); // Usually the sort direction (1, -1)
    const fieldParts = parts.join("_");

    if (fieldParts.length <= maxLength - 3) {
      return `${fieldParts}_${sortInfo}`;
    }

    // Truncate the field part but keep the sort info
    const truncatedFields = fieldParts.slice(
      0,
      maxLength - sortInfo!.length - 4,
    );
    return `${truncatedFields}..._${sortInfo}`;
  }

  // Simple truncation for non-compound indexes
  return `${indexName.slice(0, maxLength - 3)}...`;
}

/**
 * Smart text wrapping for long values
 */
export function smartWrap(text: string, maxLineLength = 25): string {
  if (text.length <= maxLineLength) return text;

  // For JSON-like content, try to break at natural points
  if (text.includes("{") || text.includes("[")) {
    // Break at comma separators if possible
    const commaIndex = text.indexOf(",", maxLineLength - 5);
    if (commaIndex > 0 && commaIndex < maxLineLength + 5) {
      return `${text.slice(0, commaIndex + 1)}...`;
    }
  }

  // For dot notation paths, break at dots
  if (text.includes(".")) {
    const dotIndex = text.lastIndexOf(".", maxLineLength);
    if (dotIndex > maxLineLength / 2) {
      return `${text.slice(0, dotIndex)}...`;
    }
  }

  // Default truncation
  return `${text.slice(0, maxLineLength - 3)}...`;
}

/**
 * Resolve section for a field, matching stageDisplayFormatter.resolveSection().
 */
function resolveSection(field: {
  section?: string;
  verbosity: string;
}): string {
  if (field.section) return field.section;
  if (field.verbosity === "queryPlanner") return "configuration";
  return "execution";
}

/**
 * Estimate the number of non-zero fields per section for a stage.
 * Used by calculateNodeHeight to estimate section sizes without needing warnings.
 */
function estimateFieldCounts(
  stage: NodeSizingStage,
  metrics: Record<string, number | boolean | string | undefined>,
): { configuration: number; execution: number; engine: number } {
  const def = stage.definition;
  if (!def || !hasExplainFields(def))
    return { configuration: 0, execution: 0, engine: 0 };

  const allFields = getFieldsForStage(def);
  let configuration = 0;
  let execution = 0;
  let engine = 0;
  const structure = stage.structure as Record<string, unknown> | undefined;

  for (const field of allFields) {
    const section = resolveSection(field);

    if (section === "configuration") {
      const rawValue = structure?.[field.bsonKey];
      if (rawValue !== undefined && rawValue !== null) configuration++;
    } else {
      if (field.valueType === "object") continue;
      const value = metrics[field.bsonKey];
      if (value === undefined) continue;
      if (section === "engine") {
        engine++;
      } else {
        execution++;
      }
    }
  }

  // Universal filter field (not declared per-stage)
  if (
    structure?.filter !== undefined &&
    structure.filter !== null &&
    !allFields.some((f) => f.bsonKey === "filter")
  ) {
    configuration++;
  }

  return { configuration, execution, engine };
}

/**
 * Calculate the expected height of a node based on its content
 */
export function calculateNodeHeight(
  stage: NodeSizingStage,
  mode: "plan" | "execution" = "execution",
): number {
  const MIN_HEIGHT = 100; // Minimum height for any node
  const HEADER_HEIGHT = 36; // Header with stage name and JSON toggle (compact)
  const TIME_BAR_HEIGHT = 30; // Self time label + bar (single line above bar)
  const SECTION_HEADER_HEIGHT = 20; // Section headers like "Execution Metrics"
  const FIELD_HEIGHT = 24; // Each data field row
  const SECTION_MARGIN = 12; // Margin between sections
  const PADDING = 16; // Top and bottom padding
  const SLOT_ROW_HEIGHT = 32; // Height for slot rows (multiple slots per row)
  const SLOT_SECTION_HEIGHT = 60; // Height for slot flow sections

  let totalHeight = PADDING + HEADER_HEIGHT;

  const metrics = getMetrics(stage);

  // Self time bar (execution mode with timing data)
  if (
    mode === "execution" &&
    metrics.executionTimeMillis !== undefined &&
    metrics.selfTimeMillis !== undefined
  ) {
    totalHeight += TIME_BAR_HEIGHT;
  }

  // All sections are data-driven from explainFields declarations
  const fieldCounts = estimateFieldCounts(stage, metrics);

  // Stage Configuration section
  if (fieldCounts.configuration > 0) {
    totalHeight += SECTION_HEADER_HEIGHT + SECTION_MARGIN;
    totalHeight += fieldCounts.configuration * FIELD_HEIGHT;
  }

  // Execution Metrics section
  if (mode === "execution") {
    if (fieldCounts.execution > 0) {
      totalHeight += SECTION_HEADER_HEIGHT + SECTION_MARGIN;
      totalHeight += fieldCounts.execution * FIELD_HEIGHT;
    }

    // Engine Internals
    if (fieldCounts.engine > 0) {
      totalHeight += SECTION_HEADER_HEIGHT + SECTION_MARGIN;
      totalHeight += fieldCounts.engine * FIELD_HEIGHT;
    }
  }

  // SBE Slot Flow sections
  if (stage.sbeData?.slots) {
    const hasConsumedSlots =
      stage.sbeData.slots.consumed && stage.sbeData.slots.consumed.length > 0;
    const hasProducedSlots =
      stage.sbeData.slots.produced && stage.sbeData.slots.produced.length > 0;

    if (hasConsumedSlots || hasProducedSlots) {
      totalHeight += SECTION_HEADER_HEIGHT + SECTION_MARGIN;
      totalHeight += SLOT_SECTION_HEIGHT; // Account for slot flow section
    }
  }

  // SBE Referenced Slots section
  if (
    stage.sbeData?.slotReferences &&
    stage.sbeData.slotReferences.length > 0
  ) {
    totalHeight += SECTION_HEADER_HEIGHT + SECTION_MARGIN;
    const slotCount = stage.sbeData.slotReferences.length;
    const rowsNeeded = Math.min(Math.ceil(slotCount / 6), 2);
    totalHeight += rowsNeeded * SLOT_ROW_HEIGHT;
  }

  // Calculated Metrics section (execution mode only)
  if (mode === "execution") {
    const hasDocumentEfficiency =
      metrics.nReturned !== undefined &&
      metrics.docsExamined !== undefined &&
      metrics.docsExamined > 0;
    const hasIndexEfficiency =
      metrics.nReturned !== undefined &&
      metrics.keysExamined !== undefined &&
      metrics.keysExamined > 0;

    if (hasDocumentEfficiency || hasIndexEfficiency) {
      totalHeight += SECTION_HEADER_HEIGHT + SECTION_MARGIN;
      let metricsCount = 0;
      if (hasDocumentEfficiency) metricsCount++;
      if (hasIndexEfficiency) metricsCount++;
      totalHeight += metricsCount * FIELD_HEIGHT;
    }
  }

  // Aggregation Stage Configuration section
  if (stage.aggregationData?.stageConfiguration) {
    totalHeight += SECTION_HEADER_HEIGHT + SECTION_MARGIN;
    totalHeight += 80; // Fixed height for JSON configuration display
  }

  totalHeight += PADDING; // Bottom padding

  return Math.max(totalHeight, MIN_HEIGHT);
}
