"use client";

import type { ExplainPlan } from "#types/explain-plan";
import { PipelineStageSelector } from "#components/shared/PipelineStageSelector";

interface PipelineOverviewProps {
  readonly explainPlan: ExplainPlan;
  readonly onStageSelect: (stageIndex: number, stageName: string) => void;
  readonly selectedStageIndex: number | null;
  readonly className?: string;
}

/**
 * Pipeline overview using shared herringbone design
 * Shows all aggregation pipeline stages with proper visual styling
 */
export function PipelineOverview({
  explainPlan,
  onStageSelect,
  selectedStageIndex,
  className = "",
}: PipelineOverviewProps) {
  // Extract all stages from the explain plan and convert to PipelineStage format
  const stages = (explainPlan.stages ?? []).map((stage, index) => {
    if (typeof stage !== "object" || !stage) {
      return {
        name: "UNKNOWN",
        data: stage,
        index,
        isClickable: false,
        nReturned: 0,
      };
    }

    // Handle $cursor stage
    if ("$cursor" in stage) {
      const cursorData = stage.$cursor as Record<string, unknown> | undefined;
      const executionStats = cursorData?.executionStats as
        | Record<string, unknown>
        | undefined;
      const nReturned =
        typeof executionStats?.nReturned === "number"
          ? executionStats.nReturned
          : 0;
      return {
        name: "$cursor",
        data: stage,
        index,
        isClickable: true,
        nReturned,
      };
    }

    // Handle other aggregation stages
    const stageObj = stage as Record<string, unknown>;
    const stageName =
      Object.keys(stageObj).find((key) => key.startsWith("$")) ?? "UNKNOWN";
    const nReturned =
      typeof stageObj.nReturned === "number" ? stageObj.nReturned : 0;

    return {
      name: stageName,
      data: stage,
      index,
      isClickable: true,
      nReturned,
    };
  });

  return (
    <PipelineStageSelector
      stages={stages}
      selectedStageIndex={selectedStageIndex}
      onStageSelect={onStageSelect}
      className={className}
      showExpandedDetails={false}
    />
  );
}
