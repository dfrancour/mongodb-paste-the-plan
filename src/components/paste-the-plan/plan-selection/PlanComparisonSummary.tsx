"use client";

import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import type { PlanComparison } from "#types/explain-plan";
import {
  formatEfficiency,
  formatMetricNumber,
} from "#lib/utils/planEfficiencyUtils";
import { Tooltip } from "#components/common/Tooltip";
import { InfoButton } from "#components/shared/InfoButton";

interface PlanComparisonSummaryProps {
  readonly winningPlan: PlanComparison;
  readonly rejectedPlans: PlanComparison[];
  readonly className?: string;
}

/**
 * Focused component showing essential plan comparison metrics for query tuning
 *
 * Displays vertical comparison of winning vs rejected plan efficiency without
 * overwhelming detail, optimized for developer/DBA workflow.
 */
export function PlanComparisonSummary({
  winningPlan,
  rejectedPlans,
  className = "",
}: PlanComparisonSummaryProps) {
  const [selectedRejectedPlan, setSelectedRejectedPlan] = useState<number>(0);
  const rejectedPlan = rejectedPlans[selectedRejectedPlan];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Winning Plan */}
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-700 dark:bg-green-900/20">
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <div className="font-semibold text-green-900 dark:text-green-200">
            Winning Plan
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {winningPlan.indexName
              ? `Index: ${winningPlan.indexName}`
              : "Collection Scan"}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {winningPlan.score !== undefined && (
              <>
                <span className="bg-primary-light dark:bg-primary-dark border-primary rounded border px-2 py-1 text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Score: {winningPlan.score.toFixed(4)}
                </span>
                <span className="text-neutral-500 dark:text-neutral-400">
                  =
                </span>
              </>
            )}
            <span className="rounded border border-blue-300 bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800 dark:border-blue-700 dark:bg-blue-900 dark:text-blue-200">
              Base (1)
            </span>
            {winningPlan.efficiency.productivity !== undefined && (
              <>
                <span className="text-neutral-500 dark:text-neutral-400">
                  +
                </span>
                <span className="rounded border border-green-300 bg-green-100 px-2 py-1 text-xs font-bold text-green-800 dark:border-green-700 dark:bg-green-900 dark:text-green-200">
                  Productivity (+
                  {winningPlan.efficiency.productivity.toFixed(4)})
                </span>
              </>
            )}
            {/* EOF Bonus - Major Scoring Component (+1.0) */}
            {winningPlan.eofBonus && (
              <>
                <span className="text-neutral-500 dark:text-neutral-400">
                  +
                </span>
                <span className="rounded border border-purple-300 bg-purple-100 px-2 py-1 text-xs font-bold text-purple-800 dark:border-purple-700 dark:bg-purple-900 dark:text-purple-200">
                  EOF Bonus (+1)
                </span>
              </>
            )}
            {/* MongoDB Tie-Breaker Bonuses (ε values) */}
            {winningPlan.tieBreakers?.noFetch && (
              <>
                <span className="text-neutral-500 dark:text-neutral-400">
                  +
                </span>
                <span className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  Covered Query (+ε)
                </span>
              </>
            )}
            {winningPlan.tieBreakers?.noSort && (
              <>
                <span className="text-neutral-500 dark:text-neutral-400">
                  +
                </span>
                <span className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  Indexed Sort (+ε)
                </span>
              </>
            )}
            {winningPlan.tieBreakers?.noIntersection && (
              <>
                <span className="text-neutral-500 dark:text-neutral-400">
                  +
                </span>
                <span className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  Single Index (+ε)
                </span>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-700 dark:text-neutral-300">
            <div>
              advanced:{" "}
              <span className="font-medium">
                {formatMetricNumber(winningPlan.metrics.advanced ?? 0)}
              </span>
            </div>
            <div>
              totalDocsExamined:{" "}
              <span className="font-medium">
                {formatMetricNumber(winningPlan.metrics.totalDocsExamined ?? 0)}
              </span>
            </div>
            <div>
              works:{" "}
              <span className="font-medium">
                {formatMetricNumber(winningPlan.metrics.works ?? 0)}
              </span>
            </div>
            <div>
              nReturned:{" "}
              <span className="font-medium">
                {formatMetricNumber(winningPlan.metrics.nReturned ?? 0)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              Productivity:
              <Tooltip content="advanced / works">
                <InfoButton aria-label="Productivity formula" size="sm" />
              </Tooltip>
              <span className="font-medium">
                {formatEfficiency(winningPlan.efficiency.productivity ?? 0)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              Document Efficiency:
              <Tooltip content="nReturned / totalDocsExamined">
                <InfoButton
                  aria-label="Document Efficiency formula"
                  size="sm"
                />
              </Tooltip>
              <span className="font-medium">
                {formatEfficiency(
                  winningPlan.efficiency.documentEfficiency ?? 0,
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rejected Plan Selector */}
      {rejectedPlans.length > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <label htmlFor="rejected-plan-select" className="font-medium">
            Compare to:
          </label>
          <select
            id="rejected-plan-select"
            value={selectedRejectedPlan}
            onChange={(e) => setSelectedRejectedPlan(Number(e.target.value))}
            className="btn-small border border-neutral-300 bg-white text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          >
            {rejectedPlans.map((_, index) => (
              <option key={index} value={index}>
                Rejected Plan {index + 1}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Rejected Plan */}
      {rejectedPlan ? (
        <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-600 dark:bg-neutral-800/50">
          <div className="mb-3 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
            <div className="font-semibold text-neutral-700 dark:text-neutral-300">
              Rejected Plan
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {rejectedPlan.indexName
                ? `Index: ${rejectedPlan.indexName}`
                : "Collection Scan"}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {rejectedPlan.score !== undefined && (
                <>
                  <span className="bg-primary-light dark:bg-primary-dark border-primary rounded border px-2 py-1 text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    Score: {rejectedPlan.score.toFixed(4)}
                  </span>
                  <span className="text-neutral-500 dark:text-neutral-400">
                    =
                  </span>
                </>
              )}
              <span className="rounded border border-blue-300 bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800 dark:border-blue-700 dark:bg-blue-900 dark:text-blue-200">
                Base (1)
              </span>
              {rejectedPlan.efficiency.productivity !== undefined && (
                <>
                  <span className="text-neutral-500 dark:text-neutral-400">
                    +
                  </span>
                  <span className="rounded border border-green-300 bg-green-100 px-2 py-1 text-xs font-bold text-green-800 dark:border-green-700 dark:bg-green-900 dark:text-green-200">
                    Productivity (+
                    {rejectedPlan.efficiency.productivity.toFixed(4)})
                  </span>
                </>
              )}
              {/* EOF Bonus - Major Scoring Component (+1.0) */}
              {rejectedPlan.eofBonus && (
                <>
                  <span className="text-neutral-500 dark:text-neutral-400">
                    +
                  </span>
                  <span className="rounded border border-purple-300 bg-purple-100 px-2 py-1 text-xs font-bold text-purple-800 dark:border-purple-700 dark:bg-purple-900 dark:text-purple-200">
                    EOF Bonus (+1)
                  </span>
                </>
              )}
              {/* MongoDB Tie-Breaker Bonuses (ε values) */}
              {rejectedPlan.tieBreakers?.noFetch && (
                <>
                  <span className="text-neutral-500 dark:text-neutral-400">
                    +
                  </span>
                  <span className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    Covered Query (+ε)
                  </span>
                </>
              )}
              {rejectedPlan.tieBreakers?.noSort && (
                <>
                  <span className="text-neutral-500 dark:text-neutral-400">
                    +
                  </span>
                  <span className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    Indexed Sort (+ε)
                  </span>
                </>
              )}
              {rejectedPlan.tieBreakers?.noIntersection && (
                <>
                  <span className="text-neutral-500 dark:text-neutral-400">
                    +
                  </span>
                  <span className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    Single Index (+ε)
                  </span>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-700 dark:text-neutral-300">
              <div>
                advanced:{" "}
                <span className="font-medium">
                  {formatMetricNumber(rejectedPlan.metrics.advanced ?? 0)}
                </span>
              </div>
              <div>
                totalDocsExamined:{" "}
                <span className="font-medium">
                  {formatMetricNumber(
                    rejectedPlan.metrics.totalDocsExamined ?? 0,
                  )}
                </span>
              </div>
              <div>
                works:{" "}
                <span className="font-medium">
                  {formatMetricNumber(rejectedPlan.metrics.works ?? 0)}
                </span>
              </div>
              <div>
                nReturned:{" "}
                <span className="font-medium">
                  {formatMetricNumber(rejectedPlan.metrics.nReturned ?? 0)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                Productivity:
                <Tooltip content="advanced / works">
                  <InfoButton aria-label="Productivity formula" size="sm" />
                </Tooltip>
                <span className="font-medium">
                  {formatEfficiency(rejectedPlan.efficiency.productivity ?? 0)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                Document Efficiency:
                <Tooltip content="nReturned / totalDocsExamined">
                  <InfoButton
                    aria-label="Document Efficiency formula"
                    size="sm"
                  />
                </Tooltip>
                <span className="font-medium">
                  {formatEfficiency(
                    rejectedPlan.efficiency.documentEfficiency ?? 0,
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-600 dark:bg-neutral-800">
          <div className="text-center text-neutral-600 dark:text-neutral-400">
            <div className="mb-1 text-sm font-medium">No Alternative Plans</div>
            <div className="text-xs">
              MongoDB used the only viable execution plan
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
