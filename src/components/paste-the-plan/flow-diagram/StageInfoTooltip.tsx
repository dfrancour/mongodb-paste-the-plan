"use client";

import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import type { StageDefinition } from "#data/stages/types";
import { getStageAnchorId } from "#data/stages";
import { Tooltip } from "#components/common/Tooltip";
import { InfoButton } from "#components/shared/InfoButton";
import { LayerBadge } from "#components/shared/LayerBadge";

interface StageInfoTooltipProps {
  readonly stageDef: StageDefinition;
}

/**
 * Tooltip content for MongoDB stage definitions.
 *
 * Shows expanded name, description, and a link to the full glossary.
 */
function StageInfoContent({ stageDef }: StageInfoTooltipProps) {
  return (
    <div className="max-w-xs space-y-2">
      {/* Full name + layer badge */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
          {stageDef.fullName}
        </span>
        <LayerBadge stage={stageDef} />
      </div>

      {/* Description */}
      <p className="text-sm text-neutral-700 dark:text-neutral-300">
        {stageDef.description}
      </p>

      {/* Link to glossary with search for this stage */}
      <a
        href={`./mongodb-stage-glossary#${encodeURIComponent(getStageAnchorId(stageDef))}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        onClick={(e) => e.stopPropagation()}
      >
        View in Stage Glossary
        <ExternalLinkIcon className="h-3 w-3" />
      </a>
    </div>
  );
}

/**
 * Info icon with tooltip showing stage definition details.
 *
 * Use this in FlowNode and other components that show stage information.
 */
export function StageInfoTooltip({ stageDef }: StageInfoTooltipProps) {
  return (
    <Tooltip
      content={<StageInfoContent stageDef={stageDef} />}
      side="right"
      align="start"
    >
      <InfoButton
        aria-label={`Stage information: ${stageDef.fullName}`}
        onClick={(e) => e.stopPropagation()}
      />
    </Tooltip>
  );
}
