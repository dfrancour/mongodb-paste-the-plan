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
import { hasExecutionMetrics } from "#types/explain-plan";
import { extractGridMetrics } from "#lib/visualization/stageDisplayFormatter";
import { safeRenderJson, isNonEmptyObject } from "#lib/utils/jsxUtils";
import { FlowNodeLogic } from "#lib/visualization/flowNodeLogic";
import { StageIcons } from "#lib/visualization/stageIcons";
import { StageInfoTooltip } from "./StageInfoTooltip";
import { Tooltip } from "#components/common/Tooltip";
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
    const performanceIcon = FlowNodeLogic.getPerformanceIcon(
      stage.metrics?.executionTimeMillis,
    );
    const stageIconName = stage.iconName;
    const stageIconColor = "text-neutral-600 dark:text-neutral-400";
    const containerClasses = FlowNodeLogic.getPerformanceContainerClasses(
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
              {hasExecutionMetrics(stage) && stage.shardName && (
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
                  {gridMetrics.coreMetrics.time.value !== "—" && (
                    <span className="flex items-center">
                      <span
                        className={`text-sm font-semibold ${gridMetrics.coreMetrics.time.color}`}
                      >
                        {gridMetrics.coreMetrics.time.value}
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

// JSON View Subcomponent
function FlowNodeJsonView({ stage }: { stage: FlowStage }) {
  return (
    <div className="mb-4 text-xs">
      <div className="rounded border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-neutral-900">
        <pre className="font-mono text-xs break-all whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
          {safeRenderJson(stage.metrics)}
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
      {/* Stage Implementation - How MongoDB executed this specific stage */}
      {FlowNodeLogic.shouldShowImplementationSection(stage) && (
        <>
          {mode === "execution" && (
            <div className="mt-3 mb-2 border-b border-neutral-200 pb-1 text-xs font-medium text-neutral-600 dark:border-neutral-600 dark:text-neutral-400">
              <span>Stage Implementation</span>
            </div>
          )}

          {stage.structure.indexName && (
            <div className="mb-2 text-xs">
              <div className="flex items-start justify-between text-neutral-700 dark:text-neutral-300">
                <span className="shrink-0 font-mono text-neutral-600 dark:text-neutral-400">
                  indexName:
                </span>
                <span className="font-mono text-xs leading-tight font-semibold break-all text-neutral-900 dark:text-neutral-100">
                  {stage.structure.indexName}
                </span>
              </div>
            </div>
          )}

          {stage.structure.direction && (
            <div className="mb-2 text-xs">
              <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
                <span className="font-mono text-neutral-600 dark:text-neutral-400">
                  direction:
                </span>
                <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                  {stage.structure.direction}
                </span>
              </div>
            </div>
          )}

          {isNonEmptyObject(stage.structure.indexBounds) && (
            <div className="mb-2 text-xs">
              <div className="text-neutral-700 dark:text-neutral-300">
                <span className="font-mono text-neutral-600 dark:text-neutral-400">
                  indexBounds:
                </span>
                <pre className="m-0 mt-1 font-mono text-xs leading-tight break-all whitespace-pre-wrap text-neutral-900 dark:text-neutral-100">
                  {safeRenderJson(stage.structure.indexBounds)}
                </pre>
              </div>
            </div>
          )}

          {isNonEmptyObject(stage.structure.filter) && (
            <div className="mb-2 text-xs">
              <div className="text-neutral-700 dark:text-neutral-300">
                <span className="font-mono text-neutral-600 dark:text-neutral-400">
                  filter:
                </span>
                <pre className="m-0 mt-1 font-mono text-xs leading-tight break-all whitespace-pre-wrap text-neutral-900 dark:text-neutral-100">
                  {safeRenderJson(stage.structure.filter)}
                </pre>
              </div>
            </div>
          )}
        </>
      )}

      {/* Data Flow - Core execution metrics (only show in execution mode) */}
      {mode === "execution" && (
        <>
          <div className="mt-3 mb-2 border-b border-neutral-200 pb-1 text-xs font-medium text-neutral-600 dark:border-neutral-600 dark:text-neutral-400">
            Data Flow
          </div>

          <div className="mb-2 text-xs">
            <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
              <span className="font-mono text-neutral-600 dark:text-neutral-400">
                nReturned:
              </span>
              <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                {FlowNodeLogic.formatMetricValue(stage.metrics?.nReturned)}
              </span>
            </div>
          </div>

          <div className="mb-2 text-xs">
            <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
              <span className="font-mono text-neutral-600 dark:text-neutral-400">
                docsExamined:
              </span>
              <span className="flex items-center">
                <span
                  className={`font-mono font-semibold ${gridMetrics.coreMetrics.docs.color}`}
                >
                  {gridMetrics.coreMetrics.docs.value}
                </span>
                <MetricWarningIndicator
                  metricKey="docsExamined"
                  warnings={stage.visualization.warnings}
                />
              </span>
            </div>
          </div>

          <div className="mb-2 text-xs">
            <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
              <span className="font-mono text-neutral-600 dark:text-neutral-400">
                keysExamined:
              </span>
              <span className="flex items-center">
                <span
                  className={`font-mono font-semibold ${gridMetrics.coreMetrics.keys.color}`}
                >
                  {gridMetrics.coreMetrics.keys.value}
                </span>
                <MetricWarningIndicator
                  metricKey="keysExamined"
                  warnings={stage.visualization.warnings}
                />
              </span>
            </div>
          </div>
        </>
      )}

      {/* Calculated Metrics - Only show if there are metrics to display */}
      {(gridMetrics.performanceIndicators.selectivity.value !== "—" ||
        gridMetrics.performanceIndicators.efficiency.value !== "—") && (
        <>
          <div className="mt-3 mb-2 border-b border-neutral-200 pb-1 text-xs font-medium text-neutral-600 dark:border-neutral-600 dark:text-neutral-400">
            Calculated Metrics
          </div>

          {gridMetrics.performanceIndicators.selectivity.value !== "—" && (
            <div className="mb-2 text-xs">
              <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
                <span className="font-mono text-neutral-600 dark:text-neutral-400">
                  selectivity:
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
                <span className="font-mono text-neutral-600 dark:text-neutral-400">
                  efficiency:
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

      {/* Engine Internals - MongoDB work cycle metrics */}
      {FlowNodeLogic.shouldShowEngineInternalsSection(stage) && (
        <>
          <div className="mt-3 mb-2 border-b border-neutral-200 pb-1 text-xs font-medium text-neutral-600 dark:border-neutral-600 dark:text-neutral-400">
            <span>Engine Internals</span>
          </div>

          {typeof stage.metrics?.works === "number" && (
            <div className="mb-2 text-xs">
              <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
                <span className="font-mono text-neutral-600 dark:text-neutral-400">
                  works:
                </span>
                <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                  {FlowNodeLogic.formatMetricValue(stage.metrics?.works)}
                </span>
              </div>
            </div>
          )}

          {typeof stage.metrics?.advanced === "number" && (
            <div className="mb-2 text-xs">
              <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
                <span className="font-mono text-neutral-600 dark:text-neutral-400">
                  advanced:
                </span>
                <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                  {FlowNodeLogic.formatMetricValue(stage.metrics?.advanced)}
                </span>
              </div>
            </div>
          )}

          {typeof stage.metrics?.needTime === "number" && (
            <div className="mb-2 text-xs">
              <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
                <span className="font-mono text-neutral-600 dark:text-neutral-400">
                  needTime:
                </span>
                <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                  {FlowNodeLogic.formatMetricValue(stage.metrics?.needTime)}
                </span>
              </div>
            </div>
          )}
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

  // Show structural issues (COLLSCAN) and subtree performance issues (high self time) as pills
  // Stage-level findings (selectivity, efficiency) show as inline icons next to their metrics
  const pillWarnings = warnings?.filter(
    (w) => w.layer === "stageDefinition" || w.layer === "subtree",
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
