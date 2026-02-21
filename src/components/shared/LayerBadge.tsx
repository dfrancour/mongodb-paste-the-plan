import type { StageDefinition } from "#data/stages/types";
import {
  isPipelineStage,
  isPlanningStage,
  isSbeStage,
  isMongosStage,
} from "#data/stages/types";

function getLayerBadgeStyle(stage: StageDefinition): {
  label: string;
  className: string;
} {
  if (isPipelineStage(stage)) {
    return {
      label: "Pipeline",
      className:
        "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
    };
  }

  if (isPlanningStage(stage)) {
    return {
      label: "Planning",
      className:
        "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    };
  }

  if (isSbeStage(stage)) {
    return {
      label: "SBE",
      className:
        "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    };
  }

  if (isMongosStage(stage)) {
    return {
      label: "Mongos",
      className:
        "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    };
  }

  return {
    label: "Classic",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  };
}

interface LayerBadgeProps {
  readonly stage: StageDefinition;
}

export function LayerBadge({ stage }: LayerBadgeProps) {
  const badge = getLayerBadgeStyle(stage);
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}
