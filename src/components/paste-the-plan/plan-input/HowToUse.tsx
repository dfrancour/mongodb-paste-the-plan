"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Play,
  Code,
  BookOpen,
  CircleHelp,
  Lock,
} from "lucide-react";
import {
  getPlansByCategory,
  getCategories,
  getCategoryInfo,
  getPlanVariants,
} from "#lib/utils/examplePlans";
import { getFixture } from "#data/fixtures/index";
import { ExternalLink } from "#components/shared/ExternalLink";
import { Icon } from "#components/common/Icon";

interface HowToUseProps {
  readonly onPlanSelect: (planContent: string) => void;
}

/**
 * Simplified component that combines help text with example plan selection
 */
export function HowToUse({ onPlanSelect }: HowToUseProps) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handlePlanSelect = (fixtureKey: string) => {
    setLoadError(null);
    try {
      const planContent = getFixture(fixtureKey);
      onPlanSelect(JSON.stringify(planContent, null, 2));
      setShowExamples(false);
    } catch {
      setLoadError(`Failed to load example plan: ${fixtureKey}`);
    }
  };

  return (
    <div className="container-secondary">
      {/* Top-level description with icon */}
      <div className="mb-4 flex items-start gap-3">
        <div className="flex-shrink-0">
          <Icon icon={CircleHelp} variant="primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            Paste the JSON of a MongoDB query explain plan in the box below to
            analyze it and visualize the execution plan.
          </p>
        </div>
      </div>

      {/* How to Get Instructions Section - Collapsible */}
      <div className="border-t border-neutral-200 dark:border-neutral-600">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="flex w-full cursor-pointer items-center gap-2 py-2 text-sm font-medium text-neutral-700 transition-colors hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
        >
          {showInstructions ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <Code className="h-4 w-4" />
          How to get an explain plan
        </button>

        {showInstructions && (
          <div className="px-2 pb-2 pl-6">
            <p className="mb-4 text-sm text-neutral-700 dark:text-neutral-300">
              Use the explain() method on any MongoDB query or aggregation to
              analyze query performance and execution strategy.{" "}
              <ExternalLink href="https://www.mongodb.com/docs/manual/reference/explain-results/">
                Learn more
              </ExternalLink>
            </p>
            <div className="space-y-3">
              <div className="text-sm text-neutral-700 dark:text-neutral-300">
                <span className="mb-1 block text-xs font-medium">
                  Query Plan Only
                </span>
                <code className="block rounded bg-neutral-50 px-2 py-1 font-mono text-xs break-all text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200">
                  db.collection.find().explain(&quot;queryPlanner&quot;)
                </code>
              </div>
              <div className="text-sm text-neutral-700 dark:text-neutral-300">
                <span className="mb-1 block text-xs font-medium">
                  Query Plan + Performance Stats
                </span>
                <code className="block rounded bg-neutral-50 px-2 py-1 font-mono text-xs break-all text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200">
                  db.collection.find().explain(&quot;executionStats&quot;)
                </code>
              </div>
              <div className="text-sm text-neutral-700 dark:text-neutral-300">
                <span className="mb-1 block text-xs font-medium">
                  All Plans + Performance Stats
                </span>
                <code className="block rounded bg-neutral-50 px-2 py-1 font-mono text-xs break-all text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200">
                  db.collection.find().explain(&quot;allPlansExecution&quot;)
                </code>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Examples Section */}
      <div className="border-t border-neutral-200 dark:border-neutral-600">
        <button
          onClick={() => setShowExamples(!showExamples)}
          className="flex w-full cursor-pointer items-center gap-2 py-2 text-sm font-medium text-neutral-700 transition-colors hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
        >
          {showExamples ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <BookOpen className="h-4 w-4" />
          Try with example plans
        </button>

        {showExamples && (
          <div className="max-h-64 space-y-3 overflow-y-auto px-2 pb-2">
            {loadError && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {loadError}
              </p>
            )}
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Generated using the{" "}
              <ExternalLink href="https://www.mongodb.com/docs/atlas/sample-data/sample-airbnb/">
                Sample Airbnb Listings dataset
              </ExternalLink>
            </p>
            {getCategories().map((category) => {
              const categoryInfo = getCategoryInfo(category);
              const plans = getPlansByCategory(category);

              return (
                <div
                  key={category}
                  className="rounded border border-neutral-200 bg-white dark:border-neutral-600 dark:bg-neutral-800"
                >
                  {/* Category Header */}
                  <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-700">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        {categoryInfo.name}
                      </span>
                    </div>
                  </div>

                  {/* Category Plans */}
                  <div className="bg-white dark:bg-neutral-800">
                    {plans.map((plan) => {
                      const variants = getPlanVariants(plan.id);
                      return (
                        <div
                          key={plan.id}
                          className="border-primary-light border-b px-3 py-2 last:border-b-0 dark:border-neutral-700"
                        >
                          <div className="flex flex-col gap-2">
                            {/* Title/Description */}
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 text-xs font-medium text-neutral-800 dark:text-neutral-200">
                                {plan.name}
                              </div>
                              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                {plan.description}
                              </p>
                            </div>

                            {/* Buttons - Mobile Friendly */}
                            <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:gap-1.5">
                              <button
                                onClick={() =>
                                  handlePlanSelect(variants.queryPlanner)
                                }
                                className="btn-small flex cursor-pointer items-center gap-1 bg-neutral-500 text-white hover:bg-neutral-600"
                                title="Query planning information only"
                              >
                                <Play className="h-3 w-3" />
                                queryPlanner
                              </button>
                              <button
                                onClick={() =>
                                  handlePlanSelect(variants.executionStats)
                                }
                                className="btn-small bg-primary hover:bg-primary-hover flex cursor-pointer items-center gap-1 text-white"
                                title="Execution statistics and performance metrics"
                              >
                                <Play className="h-3 w-3" />
                                executionStats
                              </button>
                              <button
                                onClick={() =>
                                  handlePlanSelect(variants.allPlansExecution)
                                }
                                className="btn-small flex cursor-pointer items-center gap-1 bg-purple-600 text-white hover:bg-purple-700"
                                title="All considered plans with execution comparison"
                              >
                                <Play className="h-3 w-3" />
                                allPlansExecution
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Privacy Section */}
      <div className="border-t border-neutral-200 dark:border-neutral-600">
        <button
          onClick={() => setShowPrivacy(!showPrivacy)}
          className="flex w-full cursor-pointer items-center gap-2 py-2 text-sm font-medium text-neutral-700 transition-colors hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
        >
          {showPrivacy ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <Lock className="h-4 w-4" />
          Privacy
        </button>

        {showPrivacy && (
          <>
            <div className="px-2 pb-2 pl-6">
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                All processing happens in your browser. No plans are uploaded or
                saved.
              </p>
            </div>
            <div className="px-2 pb-2 pl-6">
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                &quot;Generate Plan Share URL&quot; compresses and encodes the
                explain plan into the URL hash fragment, which browsers never
                include in HTTP requests. This does mean, however, that anyone
                with the link can recreate the plan, so treat plan share URLs as
                you would the explain plan itself.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
