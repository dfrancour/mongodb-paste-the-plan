"use client";

import { useState, forwardRef } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Braces,
  Eye,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type {
  FlowStage,
  FlowInteractionEvents,
} from "#types/flow-visualization";
import {
  extractGridMetrics,
  type StageFieldDisplay,
} from "#lib/visualization/stageDisplayFormatter";
import { safeRenderJson, isNonEmptyObject } from "#lib/utils/jsxUtils";
import {
  getPerformanceIcon,
  getPerformanceContainerClasses,
} from "#lib/visualization/flowNodeLogic";
import { StageIcons } from "#lib/visualization/stageIcons";
import { StageInfoTooltip } from "./StageInfoTooltip";
import { Tooltip } from "#components/common/Tooltip";
import { InfoButton } from "#components/shared/InfoButton";
import { SelfTimeBar, type SelfTimeBarProps } from "./SelfTimeBar";

/** Narrow self time values for the time bar, or null when not applicable */
function getSelfTimeBarProps(
  mode: "plan" | "execution",
  stage: FlowStage,
  rootExecutionTimeMillis?: number,
): SelfTimeBarProps | null {
  if (
    mode !== "execution" ||
    stage.metrics?.selfTimeMillis === undefined ||
    stage.metrics?.executionTimeMillis === undefined ||
    stage.metrics.executionTimeMillis <= 0 ||
    rootExecutionTimeMillis === undefined ||
    rootExecutionTimeMillis <= 0
  ) {
    return null;
  }

  return {
    executionTimeMillis: stage.metrics.executionTimeMillis,
    selfTimeMillis: stage.metrics.selfTimeMillis,
    rootExecutionTimeMillis,
  };
}

/** Performance indicator icons - separate from stage icons */
const PERFORMANCE_ICONS: Record<string, LucideIcon> = {
  Zap,
  AlertCircle,
  AlertTriangle,
};

interface FlowNodeProps {
  readonly stage: FlowStage;
  readonly events: FlowInteractionEvents;
  readonly engineType?: "classic" | "sbe";
  readonly mode: "plan" | "execution"; // plan = structural only, execution = with metrics (REQUIRED)
  readonly rootExecutionTimeMillis?: number;
}

/**
 * Individual flow node component representing a MongoDB execution stage
 *
 * This component renders stages as boxes in a SQL Server-style flow diagram,
 * with performance indicators and key metrics displayed prominently.
 */
export const FlowNode = forwardRef<HTMLDivElement, FlowNodeProps>(
  function FlowNode(
    { stage, events, engineType = "classic", mode, rootExecutionTimeMillis },
    ref,
  ) {
    const { state } = stage;

    // JSON view state
    const [showJsonView, setShowJsonView] = useState(false);

    const handleMouseEnter = () => {
      events.onNodeHighlight(stage.id);
    };

    const handleMouseLeave = () => {
      events.onNodeHighlight(null);
    };

    // Extract performance icon logic
    const performanceIcon = getPerformanceIcon(
      stage.metrics?.executionTimeMillis,
    );
    const stageIconName = stage.iconName;
    const stageIconColor = "text-neutral-600 dark:text-neutral-400";
    const containerClasses = getPerformanceContainerClasses(
      state.isHighlighted,
    );
    const stageNameClasses = "text-neutral-900 dark:text-neutral-100 font-bold";

    // Get grid metrics for consistent layout
    const gridMetrics = extractGridMetrics(stage);

    const selfTimeBarProps = getSelfTimeBarProps(
      mode,
      stage,
      rootExecutionTimeMillis,
    );

    return (
      <div
        ref={ref}
        className={`${containerClasses} p-2`}
        style={{
          position: "absolute",
          left: `${stage.position.x}px`,
          top: `${stage.position.y}px`,
          width: "300px",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
          }
        }}
        aria-label={`${stage.stage} stage`}
      >
        {/* Header Row: Stage identification and JSON toggle */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {StageIcons.renderIcon(stageIconName, `h-6 w-6 ${stageIconColor}`)}
            <div className="flex flex-col">
              <span className={`text-sm font-semibold ${stageNameClasses}`}>
                {stage.stage}
              </span>
              {stage.shardName && (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {stage.shardName}
                </span>
              )}
            </div>
            {stage.definition && (
              <StageInfoTooltip stageDef={stage.definition} />
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Fallback: show time + performance icon when no time bar but has meaningful time */}
            {mode === "execution" &&
              !selfTimeBarProps &&
              stage.metrics?.executionTimeMillis !== undefined &&
              stage.metrics.executionTimeMillis > 0 && (
                <>
                  {gridMetrics.timeMetric.value !== "—" && (
                    <span className="flex items-center">
                      <span
                        className={`text-sm font-semibold ${gridMetrics.timeMetric.color}`}
                      >
                        {gridMetrics.timeMetric.value}
                      </span>
                      <MetricWarningIndicator
                        metricKey="executionTime"
                        warnings={stage.visualization.warnings}
                      />
                    </span>
                  )}
                  {(() => {
                    const PerformanceIconComponent =
                      PERFORMANCE_ICONS[performanceIcon.iconName] ?? Zap;
                    return (
                      <PerformanceIconComponent
                        className={`h-5 w-5 ${performanceIcon.colorClass}`}
                      />
                    );
                  })()}
                </>
              )}
            {/* JSON view toggle */}
            <Tooltip
              content={showJsonView ? "Show formatted view" : "Show raw JSON"}
              side="left"
            >
              <button
                onClick={() => setShowJsonView(!showJsonView)}
                className="cursor-pointer rounded p-1 text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
                aria-label={showJsonView ? "Show formatted view" : "Show JSON"}
                aria-expanded={showJsonView}
              >
                {showJsonView ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <Braces className="h-4 w-4" />
                )}
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Self Time Bar (execution mode only, when data available) */}
        {selfTimeBarProps && <SelfTimeBar {...selfTimeBarProps} />}
        {/* Show 0ms label when execution time is zero */}
        {mode === "execution" &&
          !selfTimeBarProps &&
          stage.metrics?.executionTimeMillis === 0 && (
            <div className="mb-0.5 font-mono text-xs">
              <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                0ms
              </span>
            </div>
          )}

        {/* Indicator Tray - Warning badges (only show when there are indicators) */}
        <IndicatorTray stage={stage} />

        {/* Main Content - Fixed height scrollable container to prevent node resizing */}
        <div
          className="scrollbar-subtle overflow-y-auto"
          style={{ maxHeight: "400px" }}
        >
          {showJsonView ? (
            <FlowNodeJsonView stage={stage} />
          ) : (
            <FlowNodeFormattedView
              stage={stage}
              gridMetrics={gridMetrics}
              engineType={engineType}
              mode={mode}
            />
          )}

          {/* Bottom spacing to prevent overlap with bottom bar */}
          <div className="mb-8" />
        </div>

        {/* Bottom Bar - Stage ID (development only) */}
        {process.env.NODE_ENV === "development" && (
          <div className="absolute right-1 bottom-1 left-1 font-mono text-xs text-neutral-400 dark:text-neutral-500">
            {stage.id}
          </div>
        )}
      </div>
    );
  },
);

/**
 * Reconstruct a flat stage object that mirrors the original MongoDB explain JSON.
 * In the raw output, structure fields (indexName, direction, filter, etc.) and
 * metrics fields (nReturned, docsExamined, works, etc.) all sit at the same level.
 */
function reconstructRawStageJson(stage: FlowStage): Record<string, unknown> {
  const raw: Record<string, unknown> = { stage: stage.stage };

  // Structure fields (query planner configuration)
  if (stage.structure && isNonEmptyObject(stage.structure)) {
    Object.assign(raw, stage.structure);
  }

  // Execution metrics (flat, same level as structure in raw output)
  if (stage.metrics && isNonEmptyObject(stage.metrics)) {
    Object.assign(raw, stage.metrics);
  }

  return raw;
}

// JSON View Subcomponent
function FlowNodeJsonView({ stage }: { stage: FlowStage }) {
  const jsonData = reconstructRawStageJson(stage);

  return (
    <div className="mb-4 text-xs">
      <div className="rounded border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-neutral-900">
        <pre className="font-mono text-xs break-all whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
          {safeRenderJson(jsonData)}
        </pre>
      </div>
    </div>
  );
}

// Formatted View Subcomponent
interface FlowNodeFormattedViewProps {
  stage: FlowStage;
  gridMetrics: ReturnType<typeof extractGridMetrics>;
  engineType?: "classic" | "sbe";
  mode: "plan" | "execution"; // REQUIRED
}

function FlowNodeFormattedView({
  stage,
  gridMetrics,
  engineType: _engineType = "classic",
  mode,
}: FlowNodeFormattedViewProps) {
  return (
    <>
      {/* Stage Configuration - What the query planner decided */}
      {gridMetrics.fieldSections.configuration.length > 0 && (
        <>
          <div className="mt-3 mb-2 border-b border-neutral-200 pb-1 text-xs font-medium text-neutral-600 dark:border-neutral-600 dark:text-neutral-400">
            <span>Stage Configuration</span>
          </div>
          {gridMetrics.fieldSections.configuration.map((field) => (
            <StageFieldRow key={field.bsonKey} field={field} />
          ))}
        </>
      )}

      {/* Execution Metrics - How much work this stage did (execution mode only) */}
      {mode === "execution" &&
        gridMetrics.fieldSections.execution.length > 0 && (
          <>
            <div className="mt-3 mb-2 border-b border-neutral-200 pb-1 text-xs font-medium text-neutral-600 dark:border-neutral-600 dark:text-neutral-400">
              Execution Metrics
            </div>
            {gridMetrics.fieldSections.execution.map((field) => (
              <StageFieldRow
                key={field.bsonKey}
                field={field}
                warnings={stage.visualization.warnings}
              />
            ))}
          </>
        )}

      {/* Calculated Metrics - Derived performance ratios */}
      {(gridMetrics.performanceIndicators.selectivity.value !== "—" ||
        gridMetrics.performanceIndicators.efficiency.value !== "—") && (
        <>
          <div className="mt-3 mb-2 border-b border-neutral-200 pb-1 text-xs font-medium text-neutral-600 dark:border-neutral-600 dark:text-neutral-400">
            Calculated Metrics
          </div>

          {gridMetrics.performanceIndicators.selectivity.value !== "—" && (
            <div className="mb-2 text-xs">
              <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
                <span className="flex items-center gap-0.5">
                  <span className="font-mono text-neutral-600 dark:text-neutral-400">
                    selectivity:
                  </span>
                  <Tooltip
                    content="Ratio of documents returned to documents examined (nReturned / docsExamined)"
                    side="left"
                  >
                    <InfoButton aria-label="About selectivity" size="sm" />
                  </Tooltip>
                </span>
                <span className="flex items-center">
                  <span
                    className={`font-mono font-semibold ${gridMetrics.performanceIndicators.selectivity.color}`}
                  >
                    {gridMetrics.performanceIndicators.selectivity.value}
                  </span>
                  <MetricWarningIndicator
                    metricKey="selectivity"
                    warnings={stage.visualization.warnings}
                  />
                </span>
              </div>
            </div>
          )}

          {gridMetrics.performanceIndicators.efficiency.value !== "—" && (
            <div className="mb-2 text-xs">
              <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
                <span className="flex items-center gap-0.5">
                  <span className="font-mono text-neutral-600 dark:text-neutral-400">
                    efficiency:
                  </span>
                  <Tooltip
                    content="Ratio of documents returned to index keys examined (nReturned / keysExamined)"
                    side="left"
                  >
                    <InfoButton aria-label="About efficiency" size="sm" />
                  </Tooltip>
                </span>
                <span className="flex items-center">
                  <span
                    className={`font-mono font-semibold ${gridMetrics.performanceIndicators.efficiency.color}`}
                  >
                    {gridMetrics.performanceIndicators.efficiency.value}
                  </span>
                  <MetricWarningIndicator
                    metricKey="efficiency"
                    warnings={stage.visualization.warnings}
                  />
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Engine Internals */}
      {mode === "execution" && gridMetrics.fieldSections.engine.length > 0 && (
        <>
          <div className="mt-3 mb-2 border-b border-neutral-200 pb-1 text-xs font-medium text-neutral-600 dark:border-neutral-600 dark:text-neutral-400">
            Engine Internals
          </div>
          {gridMetrics.fieldSections.engine.map((field) => (
            <StageFieldRow key={field.bsonKey} field={field} />
          ))}
        </>
      )}

      {/* Aggregation Stage Configuration - show when aggregationData is present */}
      {stage.aggregationData && (
        <>
          <div className="mt-3 mb-2 border-b border-neutral-200 pb-1 text-xs font-medium text-neutral-600 dark:border-neutral-600 dark:text-neutral-400">
            Stage Configuration
          </div>

          <div className="mb-2 text-xs">
            <div className="scrollbar-subtle max-h-40 overflow-auto rounded border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-neutral-900">
              <pre className="font-mono text-xs break-all whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                {safeRenderJson(stage.aggregationData.stageConfiguration)}
              </pre>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// Indicator Tray - Shows warning badges for structural and performance issues
interface IndicatorTrayProps {
  stage: FlowStage;
}

function IndicatorTray({ stage }: IndicatorTrayProps) {
  const { warnings } = stage.visualization;

  // Show as pills: structural issues, subtree issues, and stage-level findings
  // that don't have a metricKey (since those can't attach as inline icons).
  // Stage-level findings WITH metricKey show as inline icons next to their metrics.
  const pillWarnings = warnings?.filter(
    (w) =>
      w.layer === "stageDefinition" ||
      w.layer === "subtree" ||
      (w.layer === "stage" && !w.metricKey),
  );

  if (!pillWarnings || pillWarnings.length === 0) {
    return null;
  }

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {pillWarnings.map((warning, index) => {
        const isCritical = warning.severity === "critical";
        return (
          <Tooltip key={index} content={warning.description} side="bottom">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] leading-tight ${
                isCritical
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
              }`}
            >
              {isCritical ? (
                <AlertCircle className="h-2.5 w-2.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
              )}
              <span>{warning.title}</span>
            </span>
          </Tooltip>
        );
      })}
    </div>
  );
}

// Inline warning indicator for metrics with associated findings
interface MetricWarningIndicatorProps {
  metricKey: string;
  warnings: FlowStage["visualization"]["warnings"];
}

// Stage field row with tooltip showing description and C++ rename context
// Supports optional warning indicators for fields with matching warnings
function StageFieldRow({
  field,
  warnings,
}: {
  field: StageFieldDisplay;
  warnings?: FlowStage["visualization"]["warnings"];
}) {
  const tooltipContent = field.cppName
    ? `${field.description} (C++ name: ${field.cppName})`
    : field.description;

  const colorClass = field.color ?? "text-neutral-900 dark:text-neutral-100";

  const label = (
    <span className="flex items-center gap-0.5">
      <span className="font-mono text-neutral-600 dark:text-neutral-400">
        {field.bsonKey}:
      </span>
      <Tooltip content={tooltipContent} side="left">
        <InfoButton aria-label={`About ${field.bsonKey}`} size="sm" />
      </Tooltip>
    </span>
  );

  if (field.multiline) {
    return (
      <div className="mb-2 text-xs">
        <div className="text-neutral-700 dark:text-neutral-300">
          {label}
          <pre className="m-0 mt-1 font-mono text-xs leading-tight break-all whitespace-pre-wrap text-neutral-900 dark:text-neutral-100">
            {field.value}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-2 text-xs">
      <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
        {label}
        <span className="flex items-center">
          <span className={`font-mono font-semibold ${colorClass}`}>
            {field.value}
          </span>
          {warnings && (
            <MetricWarningIndicator
              metricKey={field.bsonKey}
              warnings={warnings}
            />
          )}
        </span>
      </div>
    </div>
  );
}

function MetricWarningIndicator({
  metricKey,
  warnings,
}: MetricWarningIndicatorProps) {
  const warning = warnings?.find((w) => w.metricKey === metricKey);

  if (!warning) return null;

  const isCritical = warning.severity === "critical";
  const IconComponent = isCritical ? AlertCircle : AlertTriangle;
  const colorClass = isCritical
    ? "text-red-500 dark:text-red-400"
    : "text-orange-500 dark:text-orange-400";

  return (
    <Tooltip content={warning.description} side="left">
      <IconComponent className={`ml-1 h-3 w-3 shrink-0 ${colorClass}`} />
    </Tooltip>
  );
}
