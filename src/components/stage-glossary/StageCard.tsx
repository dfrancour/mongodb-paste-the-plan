"use client";

import {
  AlertTriangle,
  Info,
  ExternalLink,
  HardDrive,
  FileCode,
} from "lucide-react";
import type { StageDefinition } from "#data/stages/types";
import {
  isExecutionStage,
  isPlanningStage,
  isMongosStage,
} from "#data/stages/types";
import { StageIcons } from "#lib/visualization/stageIcons";
import { LayerBadge } from "#components/shared/LayerBadge";

interface StageCardProps {
  readonly stage: StageDefinition;
  readonly anchorId: string;
  readonly isHighlighted: boolean;
}

export function StageCard({ stage, anchorId, isHighlighted }: StageCardProps) {
  const handleStageClick = () => {
    // Update URL hash without scrolling
    window.history.pushState(null, "", `#${anchorId}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleStageClick();
    }
  };

  return (
    <div
      id={anchorId}
      role="article"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`scroll-mt-[100px] rounded-lg border border-neutral-200 bg-white p-6 transition-all duration-500 hover:shadow-md focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:focus-visible:ring-offset-neutral-900 ${
        isHighlighted ? "shadow-[0_0_0_3px_rgba(168,85,247,0.4)]" : ""
      }`}
    >
      {/* Header: stacks vertically on mobile, side-by-side on larger screens */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="flex items-center gap-3">
          {StageIcons.renderIcon(
            stage.iconName,
            "h-6 w-6 flex-shrink-0 text-neutral-700 dark:text-neutral-300",
          )}
          <div className="min-w-0">
            <h3
              onClick={handleStageClick}
              className="group cursor-pointer font-mono text-lg font-bold break-words text-neutral-900 dark:text-neutral-100"
            >
              {stage.id}
              <span className="ml-1 opacity-0 transition-opacity group-hover:opacity-100">
                #
              </span>
            </h3>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              {stage.fullName}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300">
            {stage.category}
          </span>

          {/* Stage type badge */}
          <LayerBadge stage={stage} />

          {stage.introducedIn && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
              v{stage.introducedIn}+
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-neutral-700 dark:text-neutral-300">
        {stage.description}
      </p>

      {/* Execution characteristics (shown for execution, planning, and mongos stages) */}
      {(isExecutionStage(stage) ||
        isPlanningStage(stage) ||
        isMongosStage(stage)) &&
        (stage.blockingStage || stage.canSpillToDisk) && (
          <div className="mt-3 flex flex-col gap-1 text-sm">
            {stage.blockingStage && (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                Blocking Stage
              </span>
            )}
            {stage.canSpillToDisk && (
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <HardDrive className="h-4 w-4" />
                Can Spill to Disk
              </span>
            )}
          </div>
        )}

      {/* Performance notes */}
      {stage.performanceNotes && (
        <p className="mt-3 flex items-start gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span className="min-w-0 break-words">{stage.performanceNotes}</span>
        </p>
      )}

      {/* Links Section */}
      {(stage.sourceFile || stage.docsUrl) && (
        <div className="mt-4 flex flex-col gap-2 border-t border-neutral-200 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 dark:border-neutral-700">
          {stage.sourceFile && (
            <a
              href={`https://github.com/mongodb/mongo/blob/master/${stage.sourceFile}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-1.5 text-xs text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              <FileCode className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span className="font-mono break-all">{stage.sourceFile}</span>
            </a>
          )}
          {stage.docsUrl && (
            <a
              href={stage.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Documentation
            </a>
          )}
        </div>
      )}
    </div>
  );
}
