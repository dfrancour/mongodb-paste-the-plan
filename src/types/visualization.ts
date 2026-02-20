import type { NormalizedStage } from "./explain-plan";
import type { AnalyzerLayer } from "./analysis";

/**
 * Performance classification for MongoDB stages
 */
export type PerformanceLevel = "optimal" | "good" | "warning" | "critical";

/**
 * Visual styling configuration for execution plan stages
 */

/** Individual warning/issue for display */
export interface StageWarning {
  readonly title: string;
  readonly description: string;
  readonly severity: "warning" | "critical";
  readonly suggestion?: string;
  /** Which analyzer layer produced this warning */
  readonly layer: AnalyzerLayer;
  /** Category for associating with specific metrics */
  readonly category: string;
  /** Which display metric this finding relates to */
  readonly metricKey?: string;
}

export interface StageVisualization {
  readonly performanceLevel: PerformanceLevel;
  readonly primaryMetric: string;
  readonly secondaryMetric?: string;
  /** All warnings/issues affecting this stage */
  readonly warnings: StageWarning[];
  readonly optimizationSuggestion?: string;
}

/**
 * Interactive state for execution plan stages
 */
export interface StageState {
  readonly isExpanded: boolean;
  readonly isHighlighted: boolean;
  readonly showTooltip: boolean;
}

/**
 * Configuration for execution plan visualization behavior
 */
export interface ExecutionPlanVisualizationConfig {
  readonly initialExpandedDepth: number;
  readonly showPerformanceIndicators: boolean;
  readonly enableTooltips: boolean;
  readonly compactMode: boolean;
}

/**
 * Metrics for execution plan layout and rendering
 */
export interface ExecutionPlanMetrics {
  readonly totalStages: number;
  readonly maxDepth: number;
  readonly expandedStages: number;
  readonly criticalStages: number;
}

/**
 * Enhanced stage data for visualization
 */
export type VisualizationStage = NormalizedStage & {
  readonly visualization: StageVisualization;
  readonly state: StageState;
  readonly children: VisualizationStage[];
};

/**
 * Execution plan interaction event types
 */
export interface ExecutionPlanInteractionEvents {
  onStageToggle: (stageId: string) => void;
  onStageHighlight: (stageId: string | null) => void;
  onTooltipShow: (stageId: string, element: HTMLElement) => void;
  onTooltipHide: () => void;
}
