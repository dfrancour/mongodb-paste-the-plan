import type { FlowStage } from "#types/flow-visualization";
import type { NormalizedStage } from "#types/explain-plan";

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
 * Business logic for FlowNode component
 * Separates presentation logic from UI rendering
 */
export class FlowNodeLogic {
  /**
   * Determine performance icon based on execution time
   */
  static getPerformanceIcon(executionTimeMillis?: number): {
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
  static getPerformanceContainerClasses(isHighlighted: boolean): string {
    const baseClasses = "rounded-lg transition-all duration-200";
    const hoverClasses = "hover:shadow-lg";
    const highlightClasses = isHighlighted
      ? "ring-2 ring-neutral-400 ring-opacity-50"
      : "";

    return `${baseClasses} border-2 border-neutral-300 dark:border-neutral-600 ${hoverClasses} ${highlightClasses} bg-neutral-50 dark:bg-neutral-800`;
  }

  /**
   * Determine if stage implementation section should be shown
   */
  static shouldShowImplementationSection(stage: NodeSizingStage): boolean {
    return Boolean(
      stage.structure?.indexName ||
      stage.structure?.direction ||
      stage.structure?.indexBounds ||
      stage.structure?.filter,
    );
  }

  /**
   * Determine if engine internals section should be shown
   */
  static shouldShowEngineInternalsSection(stage: NodeSizingStage): boolean {
    const metrics = getMetrics(stage);
    return (
      typeof metrics.works === "number" ||
      typeof metrics.advanced === "number" ||
      typeof metrics.needTime === "number"
    );
  }

  /**
   * Format metric value with proper fallback
   */
  static formatMetricValue(value: number | undefined): string {
    return value?.toLocaleString() ?? "—";
  }

  /**
   * Truncate JSON display with ellipsis
   */
  static truncateJsonDisplay(jsonString: string, maxLength = 40): string {
    return jsonString.length > maxLength
      ? `${jsonString.slice(0, maxLength)}...`
      : jsonString;
  }

  /**
   * Intelligent truncation for index names
   */
  static truncateIndexName(indexName: string, maxLength = 35): string {
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
  static smartWrap(text: string, maxLineLength = 25): string {
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
   * Calculate the expected height of a node based on its content
   */
  static calculateNodeHeight(
    stage: NodeSizingStage,
    mode: "plan" | "execution" = "execution",
  ): number {
    const MIN_HEIGHT = 100; // Minimum height for any node
    const HEADER_HEIGHT = 36; // Header with stage name and JSON toggle (compact)
    const TIME_BAR_HEIGHT = 30; // Self time label + bar (single line above bar)
    const SECTION_HEADER_HEIGHT = 20; // Section headers like "Data Flow"
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

    // Data Flow section (execution mode only - shows nReturned, docsExamined, keysExamined)
    if (mode === "execution") {
      totalHeight += SECTION_HEADER_HEIGHT + SECTION_MARGIN;
      totalHeight += 3 * FIELD_HEIGHT; // nReturned, docsExamined, keysExamined
    }

    // Stage Implementation section
    if (this.shouldShowImplementationSection(stage)) {
      // In plan mode, no section header (we removed it)
      if (mode === "execution") {
        totalHeight += SECTION_HEADER_HEIGHT + SECTION_MARGIN;
      } else {
        // In plan mode, just add margin before implementation fields
        totalHeight += SECTION_MARGIN;
      }

      // Count all implementation fields (no collapsing)
      let implementationFields = 0;
      if (stage.structure?.indexName) implementationFields++;
      if (stage.structure?.direction) implementationFields++;
      if (stage.structure?.indexBounds) implementationFields++;
      if (stage.structure?.filter) implementationFields++;

      totalHeight += implementationFields * FIELD_HEIGHT;
    }

    // Engine Internals section (execution mode only)
    if (mode === "execution" && this.shouldShowEngineInternalsSection(stage)) {
      totalHeight += SECTION_HEADER_HEIGHT + SECTION_MARGIN;

      // Count all engine fields (no collapsing)
      let engineFields = 0;
      if (typeof metrics.works === "number") engineFields++;
      if (typeof metrics.advanced === "number") engineFields++;
      if (typeof metrics.needTime === "number") engineFields++;

      totalHeight += engineFields * FIELD_HEIGHT;
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
      // Estimate height based on number of slots (6 slots per row, max 2 rows shown)
      const slotCount = stage.sbeData.slotReferences.length;
      const rowsNeeded = Math.min(Math.ceil(slotCount / 6), 2);
      totalHeight += rowsNeeded * SLOT_ROW_HEIGHT;
    }

    // Calculated Metrics section (execution mode only)
    if (mode === "execution") {
      const hasSelectivity =
        metrics.nReturned !== undefined &&
        metrics.docsExamined !== undefined &&
        metrics.docsExamined > 0;
      const hasEfficiency =
        metrics.nReturned !== undefined &&
        metrics.keysExamined !== undefined &&
        metrics.keysExamined > 0;

      if (hasSelectivity || hasEfficiency) {
        totalHeight += SECTION_HEADER_HEIGHT + SECTION_MARGIN;
        let metricsCount = 0;
        if (hasSelectivity) metricsCount++;
        if (hasEfficiency) metricsCount++;
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
}
