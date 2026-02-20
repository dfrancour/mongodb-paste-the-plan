"use client";

import { useState } from "react";
import { Scroll, ChevronDown, ChevronRight, Info } from "lucide-react";
import type { PlanSelectionAnalysis, ExplainPlan } from "#types/explain-plan";
import { ExpandableCard } from "#components/common/ExpandableCard";
import { Icon } from "#components/common/Icon";
import { TabJSONViewer } from "#components/shared/TabJSONViewer";
import { PlanComparisonSummary } from "./PlanComparisonSummary";
import { PlanSelectionAdvancedDetails } from "./PlanSelectionAdvancedDetails";
import { extractPlanSelectionJSON } from "#lib/renderers/jsonExtractors";

interface PlanSelectionProps {
  readonly analysis: PlanSelectionAnalysis;
  readonly rawExplainPlan: ExplainPlan;
  readonly className?: string;
}

/**
 * Plan Selection component with progressive disclosure
 *
 * Focuses on essential tuning information first, with advanced details available
 * on demand. Optimized for developer/DBA query tuning workflow.
 */
export function PlanSelection({
  analysis,
  rawExplainPlan,
  className = "",
}: PlanSelectionProps) {
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);

  if (analysis.rejectedPlans.length === 0) {
    return (
      <div className={`container-info ${className}`}>
        <div className="flex items-center gap-2">
          <Scroll className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200">
            Plan Selection Analysis
          </h3>
        </div>
        <p className="mt-2 text-blue-700 dark:text-blue-300">
          No alternative plans were considered. MongoDB used the only viable
          execution plan.
        </p>
      </div>
    );
  }

  // Main content - essential information first
  const analysisContent = (
    <div className="space-y-6">
      {/* MongoDB Plan Scoring Explanation */}
      {(analysis.winningPlan.score !== undefined ||
        analysis.rejectedPlans.some((plan) => plan.score !== undefined)) && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-600 dark:bg-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon
                icon={Info}
                variant="secondary"
                size="sm"
                className="flex-shrink-0"
              />
              <div className="text-sm text-neutral-700 dark:text-neutral-300">
                <p>
                  <strong>MongoDB Plan Scoring:</strong> MongoDB empirically
                  tests multiple plans concurrently and selects the
                  highest-scoring one. Each plan has a base score of 1. Points
                  are added for Productivity, which measures how efficiently
                  documents advance through execution stages. A full +1 point
                  bonus is awarded if all documents are retrieved (EOF).
                  Tiebreaking bonuses are awarded for covered queries, indexed
                  sorts, and single index usage.
                </p>
                <p>
                  <code className="text-xs">
                    Score = Base (1) + Productivity (advanced/works) + EOF Bonus
                    (1) + Tiebreakers (ε ≤ 0.0001 each)
                  </code>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Comparison - The core information users need */}
      <PlanComparisonSummary
        winningPlan={analysis.winningPlan}
        rejectedPlans={analysis.rejectedPlans}
      />

      {/* Advanced Details - Progressive Disclosure */}
      <div className="border-t border-neutral-200 pt-4 dark:border-neutral-600">
        <button
          onClick={() => setShowAdvancedDetails(!showAdvancedDetails)}
          className="flex w-full cursor-pointer items-center gap-2 text-sm font-medium text-neutral-700 transition-colors hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
        >
          {showAdvancedDetails ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Advanced Details
        </button>

        {showAdvancedDetails && (
          <div className="mt-4">
            <PlanSelectionAdvancedDetails analysis={analysis} />
          </div>
        )}
      </div>
    </div>
  );

  // JSON content
  const jsonContent = (
    <TabJSONViewer data={extractPlanSelectionJSON(rawExplainPlan)} />
  );

  return (
    <ExpandableCard
      title="Plan Selection Analysis"
      icon={<Icon icon={Scroll} variant="primary" />}
      subtitle={`${analysis.rejectedPlans.length} rejected plan${analysis.rejectedPlans.length !== 1 ? "s" : ""}`}
      analysisContent={analysisContent}
      jsonContent={jsonContent}
      className={className}
    />
  );
}
