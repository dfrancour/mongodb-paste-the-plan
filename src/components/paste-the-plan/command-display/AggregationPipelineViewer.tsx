"use client";

import { PipelineStageSelector } from "#components/shared/PipelineStageSelector";

interface AggregationPipelineViewerProps {
  readonly pipeline: readonly unknown[];
  readonly className?: string;
}

/**
 * Visual aggregation pipeline viewer using shared herringbone component
 *
 * Displays MongoDB aggregation stages as connected chevron boxes with icons,
 * providing a quick visual overview of the pipeline structure with expandable details.
 */
export function AggregationPipelineViewer({
  pipeline,
  className = "",
}: AggregationPipelineViewerProps) {
  // Parse pipeline stages and convert to PipelineStage format
  const stages = pipeline.map((stage, index) => {
    if (typeof stage === "object" && stage !== null) {
      const stageKeys = Object.keys(stage);
      const stageType = stageKeys[0] ?? "unknown";
      const stageData = (stage as Record<string, unknown>)[stageType];

      return {
        name: stageType,
        data: stageData,
        index,
        isClickable: true,
      };
    }

    return {
      name: "unknown",
      data: stage,
      index,
      isClickable: true,
    };
  });

  if (stages.length === 0) {
    return null;
  }

  return (
    <PipelineStageSelector
      stages={stages}
      className={className}
      showExpandedDetails={true}
    />
  );
}
