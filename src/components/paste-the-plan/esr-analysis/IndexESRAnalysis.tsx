import { CheckCircle, AlertTriangle, Search } from "lucide-react";
import type { ESRAnalysis } from "#types/explain-plan";
import { Icon } from "#components/common/Icon";

interface IndexESRAnalysisProps {
  readonly analysis: ESRAnalysis;
  readonly className?: string;
}

/**
 * Component for displaying index-centric ESR analysis
 *
 * Shows the index structure (field order) and how each field
 * relates to the query's ESR conditions.
 */
export function IndexESRAnalysis({
  analysis,
  className = "",
}: IndexESRAnalysisProps) {
  const { indexName, keyPattern, esrPattern, queryConditions, indexMetadata } =
    analysis;
  const indexFields = Object.keys(keyPattern);

  const StatusIcon = esrPattern.followsESRPattern ? CheckCircle : AlertTriangle;

  return (
    <div className={`container-secondary ${className}`}>
      {/* Index Header */}
      <div className="flex items-start gap-3">
        <Icon icon={Search} variant="primary" />
        <div className="min-w-0 flex-1">
          <h4 className="header-card mb-1 break-all">
            Index Used: <span className="font-mono">{indexName}</span>
          </h4>

          {/* Index Metadata Badges */}
          <div className="flex flex-wrap gap-2 text-xs">
            {/* ESR Pattern Compliance Badge */}
            <span
              className={`flex items-center gap-1 rounded-full border px-2 py-1 ${
                esrPattern.followsESRPattern
                  ? "border-green-200 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900 dark:text-green-300"
                  : "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
              }`}
            >
              <StatusIcon className="h-3 w-3" />
              {esrPattern.followsESRPattern
                ? "ESR guideline met for query"
                : "ESR guideline not met for query"}
            </span>
          </div>
        </div>
      </div>

      {/* Index Fields */}
      <div className="mt-4">
        <h5 className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Index Fields (in order)
        </h5>
        <div className="space-y-2">
          {indexFields.map((field, idx) => {
            // direction will always exist since we're iterating over Object.keys(keyPattern)
            const direction = keyPattern[field] ?? 1;
            const condition = queryConditions.find((c) => c.field === field);
            const isMultiKey =
              indexMetadata?.multiKeyPaths?.[field] !== undefined;

            return (
              <IndexFieldRow
                key={field}
                position={idx}
                field={field}
                direction={direction}
                conditionType={condition?.type}
                operator={condition?.operator}
                isMultiKey={isMultiKey}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface IndexFieldRowProps {
  readonly position: number;
  readonly field: string;
  readonly direction: number;
  readonly conditionType?: "equality" | "sort" | "range" | "other";
  readonly operator?: string;
  readonly isMultiKey?: boolean;
}

const esrColors = {
  equality: {
    bg: "bg-green-50 dark:bg-green-900/50",
    border: "border-green-200 dark:border-green-700",
    badge: "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300",
    label: "text-green-700 dark:text-green-300",
  },
  sort: {
    bg: "bg-purple-50 dark:bg-purple-900/50",
    border: "border-purple-200 dark:border-purple-700",
    badge:
      "bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-300",
    label: "text-purple-700 dark:text-purple-300",
  },
  range: {
    bg: "bg-blue-50 dark:bg-blue-900/50",
    border: "border-blue-200 dark:border-blue-700",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300",
    label: "text-blue-700 dark:text-blue-300",
  },
  other: {
    bg: "bg-neutral-50 dark:bg-neutral-800",
    border: "border-neutral-200 dark:border-neutral-700",
    badge:
      "bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400",
    label: "text-neutral-600 dark:text-neutral-400",
  },
  unused: {
    bg: "bg-neutral-50 dark:bg-neutral-800",
    border: "border-neutral-200 dark:border-neutral-700",
    badge:
      "bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-500",
    label: "text-neutral-500 dark:text-neutral-500",
  },
};

function IndexFieldRow({
  position,
  field,
  direction,
  conditionType,
  operator,
  isMultiKey,
}: IndexFieldRowProps) {
  const colors = conditionType ? esrColors[conditionType] : esrColors.unused;
  const isUsed = conditionType !== undefined;

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 ${colors.bg} ${colors.border}`}
    >
      {/* Position indicator */}
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
        {position + 1}
      </div>

      {/* Field name and direction */}
      <div className="min-w-0 flex-1">
        <span className="font-mono text-sm text-neutral-900 dark:text-neutral-100">
          {field}
        </span>
        <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">
          {direction === 1
            ? "ASC"
            : direction === -1
              ? "DESC"
              : String(direction)}
        </span>
        {isMultiKey && (
          <span className="ml-2 rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700 dark:bg-yellow-800 dark:text-yellow-300">
            Multi-Key
          </span>
        )}
      </div>

      {/* ESR type and operator */}
      {isUsed ? (
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium uppercase ${colors.label}`}>
            {conditionType}
          </span>
          {operator && (
            <code className={`rounded px-1.5 py-0.5 text-xs ${colors.badge}`}>
              {operator}
            </code>
          )}
        </div>
      ) : (
        <span className="text-xs text-neutral-500 italic dark:text-neutral-500">
          Not used in query
        </span>
      )}
    </div>
  );
}
