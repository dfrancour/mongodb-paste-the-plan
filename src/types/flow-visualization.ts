import type {
  NormalizedStage,
  NormalizedPlanStage,
  NormalizedExecutionStage,
  ExplainPlan,
  ParsedSBEPlan,
  SBEStageExecutionStats,
} from "./explain-plan";
import type { PerformanceLevel, StageWarning } from "./visualization";
import type { AnalysisResults } from "./analysis";

/**
 * Flow-based visualization types for SQL Server-style execution plans
 */

/**
 * Position information for flow nodes
 */
export interface FlowPosition {
  readonly x: number; // Horizontal position (column)
  readonly y: number; // Vertical position (row)
  readonly level: number; // Distance from leaf nodes (0 = rightmost)
}

/**
 * Connection between flow nodes with data flow information
 */
export interface FlowConnection {
  readonly from: string; // Source stage ID
  readonly to: string; // Target stage ID
  readonly dataVolume: number; // For arrow thickness
  readonly metrics: {
    readonly nReturned?: number;
    readonly docsExamined?: number;
    readonly keysExamined?: number;
  };
  readonly fromAnchorOffsetX?: number; // Horizontal offset from node center (default: 0)
  readonly toAnchorOffsetX?: number; // Horizontal offset from node center (default: 0)
}

/**
 * Layout dimensions and positioning
 */
export interface FlowLayout {
  readonly nodes: Map<string, FlowPosition>;
  readonly connections: FlowConnection[];
  readonly dimensions: {
    readonly width: number;
    readonly height: number;
  };
}

/**
 * Enhanced stage data for flow visualization
 */
export type FlowStage = NormalizedStage & {
  readonly position: FlowPosition;
  readonly connections: FlowConnection[];
  readonly visualization: {
    readonly performanceLevel: PerformanceLevel;
    readonly primaryMetric: string;
    readonly secondaryMetric?: string;
    readonly warnings: readonly StageWarning[];
    readonly optimizationSuggestion?: string;
  };
  readonly state: {
    readonly isHighlighted: boolean;
    readonly showTooltip: boolean;
  };
  readonly sbeData?: {
    slots?: { consumed: string[]; produced: string[] };
    slotReferences?: string[];
    nodeDetails?: {
      nodeId: number;
      stages: Array<{
        stageType: string;
        slotReferences: string[];
      }>;
    };
    // Rich execution statistics for detailed display
    executionStats?: SBEStageExecutionStats[];
  };
  readonly aggregationData?: {
    readonly stageConfiguration: Record<string, unknown>;
  };
};

/**
 * Flow interaction event types
 */
export interface FlowInteractionEvents {
  onNodeHighlight: (stageId: string | null) => void;
}

/**
 * Configuration for flow visualization layout
 */
export interface FlowVisualizationLayoutConfig {
  readonly nodeWidth: number;
  readonly nodeHeight: number;
  readonly horizontalSpacing: number;
  readonly verticalSpacing: number;
  readonly showDataVolume: boolean;
  readonly showMetricsOnArrows: boolean;
  readonly aggregationPipelineSpacing: number; // Extra spacing between query and aggregation flows
}

/**
 * Discriminated union for flow visualization props
 *
 * This provides compile-time type safety ensuring:
 * - Plan mode cannot access execution metrics
 * - Execution mode has all required metrics
 * - SBE plans have slot data
 * - Classic plans don't have slot data
 */
export type FlowVisualizationProps =
  | {
      readonly mode: "plan";
      readonly engine: "classic";
      readonly plan: NormalizedPlanStage;
      readonly rawPlan: ExplainPlan;
      readonly defaultExpanded?: boolean;
      readonly analysisResults: AnalysisResults;
    }
  | {
      readonly mode: "plan";
      readonly engine: "sbe";
      readonly plan: NormalizedPlanStage;
      readonly rawPlan: ExplainPlan;
      readonly sbePlan: ParsedSBEPlan;
      readonly defaultExpanded?: boolean;
      readonly analysisResults: AnalysisResults;
    }
  | {
      readonly mode: "execution";
      readonly engine: "classic";
      readonly execution: NormalizedExecutionStage;
      readonly rawPlan: ExplainPlan;
      readonly defaultExpanded?: boolean;
      readonly analysisResults: AnalysisResults;
    }
  | {
      readonly mode: "execution";
      readonly engine: "sbe";
      readonly execution: NormalizedExecutionStage;
      readonly rawPlan: ExplainPlan;
      readonly sbePlan: ParsedSBEPlan;
      readonly defaultExpanded?: boolean;
      readonly analysisResults: AnalysisResults;
    };
