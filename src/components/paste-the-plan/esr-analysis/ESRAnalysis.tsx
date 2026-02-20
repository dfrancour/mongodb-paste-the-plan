import { Target, Info } from "lucide-react";
import type {
  ESRAnalysis as ESRAnalysisType,
  ExplainPlan,
} from "#types/explain-plan";
import { ExpandableCard } from "#components/common/ExpandableCard";
import { Icon } from "#components/common/Icon";
import { TabJSONViewer } from "#components/shared/TabJSONViewer";
import { extractESRAnalysisJSON } from "#lib/renderers/jsonExtractors";
import { extractQueryConditions } from "#lib/analyzers";
import { ExternalLink } from "#components/shared/ExternalLink";
import { QueryConditions } from "./QueryConditions";
import { IndexESRAnalysis } from "./IndexESRAnalysis";

interface ESRAnalysisProps {
  readonly analyses: ESRAnalysisType[];
  readonly rawExplainPlan: ExplainPlan;
  readonly className?: string;
}

/**
 * Component for displaying ESR (Equality, Sort, Range) analysis of compound indexes
 *
 * Analyzes compound index usage against the ESR principle and provides expert-level
 * recommendations for optimal index design and query performance.
 */
export function ESRAnalysis({
  analyses,
  rawExplainPlan,
  className = "",
}: ESRAnalysisProps) {
  // Extract query conditions from the explain plan
  const queryConditions = extractQueryConditions(rawExplainPlan);

  // Analysis content
  const analysisContent = (
    <div className="space-y-6">
      {/* Educational Banner */}
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-600 dark:bg-neutral-800">
        <div className="flex items-center gap-2">
          <Icon icon={Info} variant="secondary" size="sm" />
          <div className="text-sm text-neutral-700 dark:text-neutral-300">
            <strong>ESR Guideline:</strong> Compound indexes work best when
            matching query order: Equality → Sort → Range.{" "}
            <ExternalLink
              href="https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Learn more
            </ExternalLink>
          </div>
        </div>

        <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-600">
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
            <div>
              <div className="mb-2 font-medium text-green-700 dark:text-green-300">
                Equality
              </div>
              <div className="space-y-1 text-neutral-700 dark:text-neutral-300">
                <div>
                  <code className="rounded bg-green-100 px-1 text-green-700 dark:bg-green-800 dark:text-green-300">
                    $eq
                  </code>
                  ,{" "}
                  <code className="rounded bg-green-100 px-1 text-green-700 dark:bg-green-800 dark:text-green-300">
                    $in
                  </code>
                  ,{" "}
                  <code className="rounded bg-green-100 px-1 text-green-700 dark:bg-green-800 dark:text-green-300">
                    field: value
                  </code>
                </div>
              </div>
            </div>
            <div>
              <div className="mb-2 font-medium text-purple-700 dark:text-purple-300">
                Sort
              </div>
              <div className="space-y-1 text-neutral-700 dark:text-neutral-300">
                <div>
                  <code className="rounded bg-purple-100 px-1 text-purple-700 dark:bg-purple-800 dark:text-purple-300">
                    sort({"{field: 1}"})
                  </code>
                  ,{" "}
                  <code className="rounded bg-purple-100 px-1 text-purple-700 dark:bg-purple-800 dark:text-purple-300">
                    sort({"{field: -1}"})
                  </code>
                </div>
              </div>
            </div>
            <div>
              <div className="mb-2 font-medium text-blue-700 dark:text-blue-300">
                Range
              </div>
              <div className="space-y-1 text-neutral-700 dark:text-neutral-300">
                <div>
                  <code className="rounded bg-blue-100 px-1 text-blue-700 dark:bg-blue-800 dark:text-blue-300">
                    $gt
                  </code>
                  ,{" "}
                  <code className="rounded bg-blue-100 px-1 text-blue-700 dark:bg-blue-800 dark:text-blue-300">
                    $gte
                  </code>
                  ,{" "}
                  <code className="rounded bg-blue-100 px-1 text-blue-700 dark:bg-blue-800 dark:text-blue-300">
                    $lt
                  </code>
                  ,{" "}
                  <code className="rounded bg-blue-100 px-1 text-blue-700 dark:bg-blue-800 dark:text-blue-300">
                    $lte
                  </code>
                </div>
                <div>
                  <code className="rounded bg-blue-100 px-1 text-blue-700 dark:bg-blue-800 dark:text-blue-300">
                    $ne
                  </code>
                  ,{" "}
                  <code className="rounded bg-blue-100 px-1 text-blue-700 dark:bg-blue-800 dark:text-blue-300">
                    $nin
                  </code>
                  ,{" "}
                  <code className="rounded bg-blue-100 px-1 text-blue-700 dark:bg-blue-800 dark:text-blue-300">
                    $regex
                  </code>
                  ,{" "}
                  <code className="rounded bg-blue-100 px-1 text-blue-700 dark:bg-blue-800 dark:text-blue-300">
                    $exists
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Query Conditions - Always shown */}
      <QueryConditions conditions={queryConditions} />

      {/* Index Analyses */}
      {analyses.length > 0 ? (
        analyses.map((analysis, index) => (
          <IndexESRAnalysis key={index} analysis={analysis} />
        ))
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-center text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
          No index used for this query. Consider creating an index based on the
          query conditions above.
        </div>
      )}
    </div>
  );

  // JSON content
  const jsonContent = (
    <TabJSONViewer data={extractESRAnalysisJSON(rawExplainPlan)} />
  );

  return (
    <ExpandableCard
      title="ESR Index Analysis"
      icon={<Icon icon={Target} variant="primary" />}
      subtitle={analyses.length === 0 ? "No index used" : "Index used"}
      analysisContent={analysisContent}
      jsonContent={jsonContent}
      className={className}
    />
  );
}
