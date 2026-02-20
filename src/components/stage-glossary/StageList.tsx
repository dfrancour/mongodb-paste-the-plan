import type { StageDefinition } from "#data/stages/types";
import { getStageAnchorId } from "#data/stages";
import { StageCard } from "./StageCard";

interface StageListProps {
  readonly stages: StageDefinition[];
  readonly highlightedStage: string | null;
}

export function StageList({ stages, highlightedStage }: StageListProps) {
  if (stages.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-800">
        <p className="text-neutral-600 dark:text-neutral-400">
          No stages found matching your search criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stages.map((stage) => {
        const anchorId = getStageAnchorId(stage);
        return (
          <StageCard
            key={anchorId}
            stage={stage}
            anchorId={anchorId}
            isHighlighted={highlightedStage === anchorId}
          />
        );
      })}
    </div>
  );
}
