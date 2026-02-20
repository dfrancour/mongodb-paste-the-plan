"use client";

import { useState, useEffect, useRef } from "react";
import { StageIcons } from "#lib/visualization/stageIcons";
import { getStage } from "#data/stages";

interface PipelineStage {
  readonly name: string;
  readonly data: unknown;
  readonly index: number;
  readonly isClickable?: boolean;
  readonly nReturned?: number;
}

interface PipelineStageSelectionProps {
  readonly stages: readonly PipelineStage[];
  readonly selectedStageIndex?: number | null;
  readonly onStageSelect?: (stageIndex: number, stageName: string) => void;
  readonly className?: string;
  readonly showExpandedDetails?: boolean;
}

/**
 * Shared herringbone-style pipeline stage selector
 *
 * Displays MongoDB pipeline stages as connected chevron boxes with icons,
 * providing a visual overview and selection interface.
 */
export function PipelineStageSelector({
  stages,
  selectedStageIndex,
  onStageSelect,
  className = "",
  showExpandedDetails = false,
}: PipelineStageSelectionProps) {
  const [expandedStage, setExpandedStage] = useState<number | null>(
    selectedStageIndex ?? null,
  );
  const [firstOnLine, setFirstOnLine] = useState<Set<number>>(new Set([0]));
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleStageExpansion = (index: number) => {
    if (showExpandedDetails) {
      setExpandedStage((current) => (current === index ? null : index));
    }
    if (onStageSelect) {
      onStageSelect(index, stages[index]?.name ?? "");
    }
  };

  // Detect which stages are first on their visual line
  useEffect(() => {
    const detectFirstOnLine = () => {
      if (!containerRef.current) return;

      const stageElements =
        containerRef.current.querySelectorAll(".pipeline-stage");
      const newFirstOnLine = new Set([0]); // Always include the first stage

      let previousTop = -1;
      stageElements.forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        const currentTop = Math.floor(rect.top);

        // If this element is on a new line (different top position)
        if (previousTop >= 0 && currentTop > previousTop) {
          newFirstOnLine.add(index);
        }

        previousTop = currentTop;
      });

      setFirstOnLine(newFirstOnLine);
    };

    // Initial detection
    detectFirstOnLine();

    // Re-detect on window resize
    const handleResize = () => {
      setTimeout(detectFirstOnLine, 100); // Small delay to allow layout to settle
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [stages.length]);

  if (stages.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Pipeline Flow Visualization */}
      <div
        ref={containerRef}
        className="relative flex flex-wrap items-center"
        style={{ gap: "8px 0" }}
      >
        {stages.map((stage, index) => {
          const iconName =
            getStage("pipeline", stage.name)?.iconName ?? "Database";
          const isExpanded = showExpandedDetails
            ? expandedStage === stage.index
            : selectedStageIndex === stage.index;
          const isFirst = index === 0;
          const isLast = index === stages.length - 1;
          const isFirstOnLine = firstOnLine.has(index);

          return (
            <div
              key={stage.index}
              className={`pipeline-stage relative cursor-pointer ${isFirstOnLine ? "pipeline-stage-first-on-line" : ""}`}
              onClick={() =>
                stage.isClickable !== false && toggleStageExpansion(stage.index)
              }
              onKeyDown={(e) => {
                if (
                  (e.key === "Enter" || e.key === " ") &&
                  stage.isClickable !== false
                ) {
                  e.preventDefault();
                  toggleStageExpansion(stage.index);
                }
              }}
              role="button"
              tabIndex={stage.isClickable === false ? -1 : 0}
              aria-expanded={showExpandedDetails ? isExpanded : undefined}
              aria-label={`${stage.name} stage${stage.nReturned !== undefined ? `, ${stage.nReturned.toLocaleString()} documents returned` : ""}`}
              style={{
                clipPath: isFirst
                  ? "polygon(0% 0%, calc(100% - 16px) 0%, 100% 50%, calc(100% - 16px) 100%, 0% 100%)"
                  : isLast
                    ? "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 16px 50%)"
                    : "polygon(0% 0%, calc(100% - 16px) 0%, 100% 50%, calc(100% - 16px) 100%, 0% 100%, 16px 50%)",
                zIndex: stages.length - index,
                filter: isExpanded
                  ? "drop-shadow(0 0 0 2px oklch(var(--color-primary)))"
                  : undefined,
                opacity: stage.isClickable === false ? 0.5 : 1,
              }}
            >
              <div
                className={`flex items-center gap-1.5 px-4 py-3 transition-colors ${
                  isExpanded
                    ? "bg-primary-light dark:bg-primary-dark hover:bg-primary-light/90 dark:hover:bg-primary-dark/90 text-neutral-900 dark:text-neutral-100"
                    : "bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                }`}
                style={{
                  paddingLeft: isFirst ? "16px" : "24px",
                  paddingRight: isLast ? "16px" : "24px",
                }}
              >
                {StageIcons.renderIcon(
                  iconName,
                  `h-4 w-4 flex-shrink-0 ${isExpanded ? "text-neutral-900 dark:text-neutral-100" : "text-primary"}`,
                )}
                <span
                  className={`text-sm font-medium whitespace-nowrap ${
                    isExpanded
                      ? "text-neutral-900 dark:text-neutral-100"
                      : "text-neutral-900 dark:text-neutral-100"
                  }`}
                >
                  {stage.name}
                </span>
                {stage.nReturned !== undefined && (
                  <span
                    className={`ml-1 text-xs ${
                      isExpanded
                        ? "text-neutral-700 dark:text-neutral-300"
                        : "text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    ({stage.nReturned.toLocaleString()})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded Stage Details - only shown when showExpandedDetails is true */}
      {showExpandedDetails && expandedStage !== null && (
        <div className="space-y-3">
          {stages
            .filter((stage) => stage.index === expandedStage)
            .map((stage) => (
              <div
                key={`expanded-${stage.index}`}
                className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700"
              >
                <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800">
                  <div className="flex items-center gap-2">
                    {StageIcons.renderIcon(
                      getStage("pipeline", stage.name)?.iconName ?? "Database",
                      "h-4 w-4 text-primary",
                    )}
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {stage.name}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      Stage {stage.index + 1}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <pre className="overflow-auto text-xs text-neutral-700 dark:text-neutral-300">
                    {JSON.stringify(stage.data, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
