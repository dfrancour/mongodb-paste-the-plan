import type { NormalizedStage } from "#types/explain-plan";
import type {
  VisualizationStage,
  StageState,
  ExecutionPlanVisualizationConfig,
  ExecutionPlanMetrics,
} from "#types/visualization";
import type { AnalysisResults } from "#lib/analyzers";
import { createStageVisualization } from "#lib/visualization/stageDisplayFormatter";

/**
 * Manages execution plan visualization state and provides methods for stage operations
 *
 * This class follows the single responsibility principle by focusing solely on
 * state management and execution plan operations, separate from rendering concerns.
 */
export class ExecutionPlanStateManager {
  private stageStates = new Map<string, StageState>();
  private config: ExecutionPlanVisualizationConfig;

  constructor(
    config: ExecutionPlanVisualizationConfig = ExecutionPlanStateManager.getDefaultConfig(),
  ) {
    this.config = config;
  }

  /**
   * Convert normalized stages to visualization stages with state
   *
   * @param stage - The normalized stage to transform
   * @param analysisResults - Pre-computed analysis results from runAllAnalyzers()
   */
  transformForVisualization(
    stage: NormalizedStage,
    analysisResults: AnalysisResults,
  ): VisualizationStage {
    const visualization = createStageVisualization(stage, analysisResults);
    const state = this.getStageState(stage.id, stage.depth);

    const children = stage.children.map((child) =>
      this.transformForVisualization(child, analysisResults),
    );

    return {
      ...stage,
      visualization,
      state,
      children,
    } as VisualizationStage;
  }

  /**
   * Toggle expansion state of a node
   */
  toggleNode(stageId: string): void {
    const currentState = this.stageStates.get(stageId);
    if (currentState) {
      this.stageStates.set(stageId, {
        ...currentState,
        isExpanded: !currentState.isExpanded,
      });
    }
  }

  /**
   * Set highlight state for a node
   */
  highlightNode(stageId: string | null): void {
    // Clear all highlights first
    for (const [id, state] of this.stageStates.entries()) {
      this.stageStates.set(id, {
        ...state,
        isHighlighted: false,
      });
    }

    // Set new highlight
    if (stageId) {
      const currentState = this.stageStates.get(stageId);
      if (currentState) {
        this.stageStates.set(stageId, {
          ...currentState,
          isHighlighted: true,
        });
      }
    }
  }

  /**
   * Set tooltip visibility for a node
   */
  setTooltipVisibility(stageId: string, visible: boolean): void {
    const currentState = this.stageStates.get(stageId);
    if (currentState) {
      this.stageStates.set(stageId, {
        ...currentState,
        showTooltip: visible,
      });
    }
  }

  /**
   * Expand nodes up to a certain depth
   */
  expandToDepth(depth: number, stages: VisualizationStage[]): void {
    const expandNode = (stage: VisualizationStage) => {
      if (stage.depth <= depth) {
        const currentState = this.stageStates.get(stage.id);
        if (currentState) {
          this.stageStates.set(stage.id, {
            ...currentState,
            isExpanded: true,
          });
        }
      }
      stage.children.forEach(expandNode);
    };

    stages.forEach(expandNode);
  }

  /**
   * Collapse all nodes
   */
  collapseAll(): void {
    for (const [id, state] of this.stageStates.entries()) {
      this.stageStates.set(id, {
        ...state,
        isExpanded: false,
      });
    }
  }

  /**
   * Expand all nodes
   */
  expandAll(): void {
    for (const [id, state] of this.stageStates.entries()) {
      this.stageStates.set(id, {
        ...state,
        isExpanded: true,
      });
    }
  }

  /**
   * Get current state for a node, creating default if not exists
   */
  private getStageState(stageId: string, depth: number): StageState {
    let state = this.stageStates.get(stageId);

    if (!state) {
      state = {
        isExpanded: depth < this.config.initialExpandedDepth,
        isHighlighted: false,
        showTooltip: false,
      };
      this.stageStates.set(stageId, state);
    }

    return state;
  }

  /**
   * Calculate tree metrics for the current state
   */
  calculateMetrics(stages: VisualizationStage[]): ExecutionPlanMetrics {
    let totalNodes = 0;
    let maxDepth = 0;
    let expandedNodes = 0;
    let criticalNodes = 0;

    const traverseStages = (stage: VisualizationStage) => {
      totalNodes++;
      maxDepth = Math.max(maxDepth, stage.depth);

      if (stage.state.isExpanded) {
        expandedNodes++;
      }

      if (stage.visualization.performanceLevel === "critical") {
        criticalNodes++;
      }

      stage.children.forEach(traverseStages);
    };

    stages.forEach(traverseStages);

    return {
      totalStages: totalNodes,
      maxDepth,
      expandedStages: expandedNodes,
      criticalStages: criticalNodes,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ExecutionPlanVisualizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): ExecutionPlanVisualizationConfig {
    return { ...this.config };
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.stageStates.clear();
  }

  /**
   * Get default configuration
   */
  static getDefaultConfig(): ExecutionPlanVisualizationConfig {
    return {
      initialExpandedDepth: 2,
      showPerformanceIndicators: true,
      enableTooltips: true,
      compactMode: false,
    };
  }

  /**
   * Export current state for persistence/debugging
   */
  exportState(): Record<string, StageState> {
    return Object.fromEntries(this.stageStates);
  }

  /**
   * Import state from external source
   */
  importState(state: Record<string, StageState>): void {
    this.stageStates.clear();
    for (const [id, nodeState] of Object.entries(state)) {
      this.stageStates.set(id, nodeState);
    }
  }
}
