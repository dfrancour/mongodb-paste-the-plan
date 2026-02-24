import type { NormalizedStage } from "#types/explain-plan";
import type {
  FlowConnection,
  FlowLayout,
  FlowStage,
} from "#types/flow-visualization";
import type { AnalysisResults } from "#lib/analyzers";
import { createStageVisualization } from "../stageDisplayFormatter";

/**
 * Transform a normalized stage tree into flow stages with positions
 */
export function transformToFlowStages(
  rootStage: NormalizedStage,
  layout: FlowLayout,
  analysisResults: AnalysisResults,
): FlowStage[] {
  const flowStages: FlowStage[] = [];

  // Pre-index connections by source ID to avoid O(n^2) filtering
  const connectionsByFrom = new Map<string, FlowConnection[]>();
  for (const conn of layout.connections) {
    const existing = connectionsByFrom.get(conn.from);
    if (existing) {
      existing.push(conn);
    } else {
      connectionsByFrom.set(conn.from, [conn]);
    }
  }

  const traverse = (stage: NormalizedStage) => {
    const position = layout.nodes.get(stage.id);
    if (!position) return;

    const connections = connectionsByFrom.get(stage.id) ?? [];

    const stageVisualization = createStageVisualization(stage, analysisResults);

    const flowStage: FlowStage = {
      ...stage,
      position,
      connections,
      visualization: stageVisualization,
      state: {
        isHighlighted: false,
        showTooltip: false,
      },
    };

    flowStages.push(flowStage);

    stage.children.forEach((child) => traverse(child));
  };

  traverse(rootStage);
  return flowStages;
}
