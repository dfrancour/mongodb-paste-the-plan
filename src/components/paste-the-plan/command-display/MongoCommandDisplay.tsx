"use client";

import { Database } from "lucide-react";
import { CommandExtractor } from "#lib/parsers/commandExtractor";
import { PlanParser } from "#lib/parsers/planParser";
import type { ExplainPlan } from "#types/explain-plan";
import { ExpandableCard } from "#components/common/ExpandableCard";
import { Icon } from "#components/common/Icon";
import { TabJSONViewer } from "#components/shared/TabJSONViewer";
import { CodeViewer } from "#components/common/CodeViewer";
import { extractMongoCommandJSON } from "#lib/renderers/jsonExtractors";
import { AggregationPipelineViewer } from "./AggregationPipelineViewer";

interface MongoCommandDisplayProps {
  readonly explainPlan: ExplainPlan;
  readonly className?: string;
}

/**
 * Component for displaying the MongoDB command derived from explain plan
 *
 * Shows the actual MongoDB command that was executed with copy functionality
 * and metadata about the operation.
 */
export function MongoCommandDisplay({
  explainPlan,
  className = "",
}: MongoCommandDisplayProps) {
  const queryInfo = CommandExtractor.extractQuery(explainPlan);
  const explainMode = PlanParser.detectExplainMode(explainPlan);
  const commandString = CommandExtractor.formatAsCommand(
    queryInfo,
    explainMode,
  );
  const pipelineStages = CommandExtractor.extractPipelineStages(queryInfo);

  // Analysis content - different for aggregation vs find operations
  const analysisContent = (
    <div className="space-y-4">
      {/* Show pipeline viewer for aggregation operations */}
      {queryInfo.operation === "aggregate" && pipelineStages.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Pipeline Stages
          </h4>
          <AggregationPipelineViewer pipeline={pipelineStages} />
          <div className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-700">
            <h4 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Full Command
            </h4>
            <CodeViewer
              content={commandString}
              copyLabel="Copy command"
              displayFormat="javascript"
            />
          </div>
        </div>
      )}

      {/* Show command viewer for find operations or when no pipeline */}
      {(queryInfo.operation !== "aggregate" || pipelineStages.length === 0) && (
        <CodeViewer
          content={commandString}
          copyLabel="Copy command"
          displayFormat="javascript"
        />
      )}
    </div>
  );

  // JSON content
  const jsonContent = (
    <TabJSONViewer data={extractMongoCommandJSON(explainPlan)} />
  );

  // Badge for operation type
  const badge = (
    <div className="bg-primary-light dark:bg-primary-dark border-primary dark:border-primary rounded border px-2 py-1 text-xs font-medium text-neutral-900 dark:text-neutral-100">
      {queryInfo.operation.toUpperCase()}
    </div>
  );

  const subtitle =
    queryInfo.database && queryInfo.database !== "unknown"
      ? `${queryInfo.database} • ${queryInfo.collection}`
      : queryInfo.collection;

  return (
    <ExpandableCard
      title="MongoDB Command"
      icon={<Icon icon={Database} variant="primary" />}
      subtitle={subtitle}
      badge={badge}
      analysisContent={analysisContent}
      jsonContent={jsonContent}
      className={className}
      defaultExpanded={true}
    />
  );
}
