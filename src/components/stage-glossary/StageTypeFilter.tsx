import { Layers } from "lucide-react";
import { PillButton } from "#components/shared/PillButton";

/** Stage type for filtering - composite of layer + engine */
export type StageType = "pipeline" | "planning" | "sbe" | "classic" | "mongos";

interface StageTypeFilterProps {
  readonly selected: StageType | null;
  readonly onToggle: (stageType: StageType) => void;
}

export function StageTypeFilter({ selected, onToggle }: StageTypeFilterProps) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-1 flex-shrink-0">
        <Layers
          className="h-5 w-5 text-neutral-600 dark:text-neutral-400"
          aria-hidden="true"
        />
      </div>
      <div>
        <div className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">
          Type
        </div>
        <div
          role="group"
          aria-label="Stage type filter"
          className="flex flex-wrap items-end"
        >
          {/* Execution group with border and label */}
          <div className="relative rounded-lg border border-neutral-300 px-1.5 pt-5 pb-1 dark:border-neutral-600">
            <span
              className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-neutral-500 dark:text-neutral-400"
              aria-hidden="true"
            >
              Execution
            </span>
            <div
              role="group"
              aria-label="Execution engine types"
              className="flex gap-1.5"
            >
              <PillButton
                isSelected={selected === "classic"}
                onClick={() => onToggle("classic")}
              >
                Classic
              </PillButton>
              <PillButton
                isSelected={selected === "sbe"}
                onClick={() => onToggle("sbe")}
              >
                SBE
              </PillButton>
            </div>
          </div>

          {/* Pipeline, Planning, and Mongos - invisible container matches Execution group height for alignment */}
          <div className="relative rounded-lg border border-transparent px-1.5 pt-5 pb-1">
            <span
              className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-transparent"
              aria-hidden="true"
            >
              Execution
            </span>
            <div className="flex gap-1.5">
              <PillButton
                isSelected={selected === "pipeline"}
                onClick={() => onToggle("pipeline")}
              >
                Pipeline
              </PillButton>
              <PillButton
                isSelected={selected === "planning"}
                onClick={() => onToggle("planning")}
              >
                Planning
              </PillButton>
              <PillButton
                isSelected={selected === "mongos"}
                onClick={() => onToggle("mongos")}
              >
                Mongos
              </PillButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
