"use client";

import { useState, useCallback, useMemo, useRef, useLayoutEffect } from "react";
import { Workflow, Activity, AlertCircle, AlertTriangle } from "lucide-react";
import type { FlowVisualizationProps } from "#types/flow-visualization";
import { Tooltip } from "#components/common/Tooltip";
import { InfoButton } from "#components/shared/InfoButton";
import type {
  FlowStage,
  FlowInteractionEvents,
} from "#types/flow-visualization";
import { Icon } from "#components/common/Icon";
import { FlowLayoutEngine } from "#lib/visualization/flowLayoutEngine";
import { FlowNode } from "./FlowNode";
import { FlowConnector, FlowConnectorDefs } from "./FlowConnector";
import { createStageVisualization } from "#lib/visualization/stageDisplayFormatter";
import {
  getSortMetrics,
  flattenStageTree,
  calculateSelfTime,
} from "#lib/analyzers";
import { FlowNodeLogic } from "#lib/visualization/flowNodeLogic";
import { ExpandableCard } from "#components/common/ExpandableCard";
import { TabJSONViewer } from "#components/shared/TabJSONViewer";
import { TabASCIIViewer } from "#components/shared/TabASCIIViewer";
import { PlanFlowASCIIRenderer } from "#lib/renderers/asciiRenderers";

/**
 * Flow Visualization Component
 *
 * Renders MongoDB explain plans as flow diagrams with performance metrics.
 * Handles all visualization modes through discriminated union:
 * - Plan mode (classic/SBE): Shows query optimization strategy
 * - Execution mode (classic/SBE): Shows runtime performance with full metrics
 *
 * Type safety ensures correct prop combinations for each mode/engine pair.
 */
export function FlowVisualization(props: FlowVisualizationProps) {
  const [highlightedStageId, setHighlightedStageId] = useState<string | null>(
    null,
  );
  const [measuredHeights, setMeasuredHeights] = useState<Map<string, number>>(
    new Map(),
  );
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Get the normalized stage and enrich with self time
  const rootStage = useMemo(() => {
    const stage = props.mode === "plan" ? props.plan : props.execution;
    if (props.mode === "execution") {
      calculateSelfTime(stage);
    }
    return stage;
  }, [props]);

  // Calculate layout and create flow stages
  // When measuredHeights is available (after first render), re-layout with
  // actual DOM heights so vertical spacing reflects real node sizes.
  const flowData = useMemo(() => {
    const layout = FlowLayoutEngine.calculateLayout(
      rootStage,
      props.mode,
      undefined,
      measuredHeights.size > 0 ? measuredHeights : undefined,
    );
    const flowStages: FlowStage[] = [];

    const createFlowStage = (stage: typeof rootStage): void => {
      const position = layout.nodes.get(stage.id) ?? { x: 0, y: 0, level: 0 };
      const connections = layout.connections.filter((c) => c.to === stage.id);

      // Create visualization using modular analyzers when available
      const stageVisualization = createStageVisualization(
        stage,
        props.analysisResults,
      );

      const flowStage: FlowStage = {
        ...stage,
        position,
        connections,
        visualization: stageVisualization,
        state: {
          isHighlighted: highlightedStageId === stage.id,
          showTooltip: false,
        },
      };

      flowStages.push(flowStage);
      stage.children.forEach((child) => createFlowStage(child));
    };

    createFlowStage(rootStage);
    return { flowStages, layout };
  }, [
    rootStage,
    highlightedStageId,
    props.mode,
    props.analysisResults,
    measuredHeights,
  ]);

  // Measure actual node heights from DOM after render
  // This intentionally sets state from useLayoutEffect to sync with DOM measurements
  useLayoutEffect(() => {
    const newHeights = new Map<string, number>();
    let hasChanges = false;

    nodeRefs.current.forEach((node, stageId) => {
      if (node) {
        const height = node.offsetHeight;
        newHeights.set(stageId, height);

        // Check if height changed
        if (measuredHeights.get(stageId) !== height) {
          hasChanges = true;
        }
      }
    });

    // Only update state if heights actually changed
    if (hasChanges) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMeasuredHeights(newHeights);
    }
  }, [flowData.flowStages, measuredHeights]);

  // Callback to register node refs
  const setNodeRef = useCallback(
    (stageId: string, element: HTMLDivElement | null) => {
      if (element) {
        nodeRefs.current.set(stageId, element);
      } else {
        nodeRefs.current.delete(stageId);
      }
    },
    [],
  );

  // Interaction handlers
  const handleStageHover = useCallback((stageId: string | null) => {
    setHighlightedStageId(stageId);
  }, []);

  const interactionEvents: FlowInteractionEvents = {
    onNodeHighlight: handleStageHover,
  };

  // Determine visualization metadata based on mode
  const vizMetadata = useMemo(() => {
    if (props.mode === "plan") {
      return {
        title: "Query Planner",
        subtitle: "MongoDB query optimization strategy",
        icon: Workflow,
        engineType: props.engine === "sbe" ? "SBE Engine" : "Classic Engine",
      };
    } else {
      return {
        title: "Execution Stats",
        subtitle: "Actual query execution performance and data flow",
        icon: Activity,
        engineType: props.engine === "sbe" ? "SBE Engine" : "Classic Engine",
      };
    }
  }, [props.mode, props.engine]);

  // Extract execution statistics (only for execution mode)
  const executionStats = useMemo(() => {
    if (props.mode !== "execution") return null;

    const stats = props.rawPlan.executionStats;
    return {
      nReturned: stats?.nReturned ?? 0,
      executionTimeMillis: stats?.executionTimeMillis ?? 0,
      totalKeysExamined: stats?.totalKeysExamined ?? 0,
      totalDocsExamined: stats?.totalDocsExamined ?? 0,
    };
  }, [props]);

  // Calculate performance color based on execution time
  const getTotalTimeColor = (timeMs: number) => {
    if (timeMs > 1000) return "text-red-600";
    if (timeMs >= 100) return "text-orange-600";
    return "text-green-600";
  };

  // Get plan-level findings for metrics coloring
  const planFindings = useMemo(() => {
    if (!props.analysisResults)
      return { docEfficiency: null, keyEfficiency: null };

    const docFinding = props.analysisResults.findings.find(
      (f) => f.id === "overall-doc-efficiency",
    );
    const keyFinding = props.analysisResults.findings.find(
      (f) => f.id === "overall-key-efficiency",
    );

    return { docEfficiency: docFinding, keyEfficiency: keyFinding };
  }, [props.analysisResults]);

  // Calculate selectivity (nReturned / docsExamined) - uses analyzer findings for coloring
  const getSelectivityMetric = useCallback(() => {
    if (!executionStats || executionStats.totalDocsExamined === 0) {
      return {
        value: "N/A",
        color: "text-neutral-900 dark:text-neutral-100",
        finding: null,
      };
    }
    const ratio = executionStats.nReturned / executionStats.totalDocsExamined;
    const percent = (ratio * 100).toFixed(1);

    // Use analyzer finding for color if available
    const finding = planFindings.docEfficiency;
    let color = "text-green-600 dark:text-green-400";
    if (finding?.severity === "critical") {
      color = "text-red-600 dark:text-red-400";
    } else if (finding?.severity === "warning") {
      color = "text-orange-600 dark:text-orange-400";
    }

    return { value: `${percent}%`, color, finding };
  }, [executionStats, planFindings]);

  // Calculate efficiency (nReturned / keysExamined) - uses analyzer findings for coloring
  const getEfficiencyMetric = useCallback(() => {
    if (!executionStats || executionStats.totalKeysExamined === 0) {
      return {
        value: "N/A",
        color: "text-neutral-900 dark:text-neutral-100",
        finding: null,
      };
    }
    const ratio = executionStats.nReturned / executionStats.totalKeysExamined;
    const percent = (ratio * 100).toFixed(1);

    // Use analyzer finding for color if available
    const finding = planFindings.keyEfficiency;
    let color = "text-green-600 dark:text-green-400";
    if (finding?.severity === "critical") {
      color = "text-red-600 dark:text-red-400";
    } else if (finding?.severity === "warning") {
      color = "text-orange-600 dark:text-orange-400";
    }

    return { value: `${percent}%`, color, finding };
  }, [executionStats, planFindings]);

  // Detect sort operations (only for execution mode)
  const sortMetrics = useMemo(() => {
    if (props.mode !== "execution") return null;
    if (!props.analysisResults) return null;

    // Use modular analyzer system for sort detection
    const allStages = flattenStageTree(rootStage);
    return getSortMetrics(allStages, props.analysisResults);
  }, [props.mode, props.analysisResults, rootStage]);

  // Root execution time for self time bar proportions
  const rootExecutionTimeMillis = rootStage.metrics?.executionTimeMillis;

  // ASCII renderer for text-based visualization
  const asciiVisualization = useMemo((): string => {
    return PlanFlowASCIIRenderer.renderClassicPlanWithMode(
      rootStage,
      props.mode,
      props.engine,
    );
  }, [rootStage, props.mode, props.engine]);

  // JSON extraction - show only relevant data based on mode
  const jsonData = useMemo((): unknown => {
    if (props.mode === "plan") {
      // For aggregation pipelines, show the stages array
      if (props.rawPlan.stages && Array.isArray(props.rawPlan.stages)) {
        return { stages: props.rawPlan.stages };
      }
      // For regular queries, show queryPlanner
      return { queryPlanner: props.rawPlan.queryPlanner };
    } else {
      // Execution mode - show executionStats
      return { executionStats: props.rawPlan.executionStats };
    }
  }, [props]);

  const { width, height } = flowData.layout.dimensions;

  // Badge for engine type
  const badge = (
    <div className="border-primary bg-primary-light dark:border-primary dark:bg-primary-dark rounded border px-2 py-1 text-xs font-medium text-neutral-900 dark:text-neutral-100">
      {vizMetadata.engineType}
    </div>
  );

  return (
    <ExpandableCard
      title={vizMetadata.title}
      subtitle={vizMetadata.subtitle}
      icon={<Icon icon={vizMetadata.icon} variant="primary" />}
      badge={badge}
      defaultExpanded={props.defaultExpanded ?? true}
      analysisContent={
        <div>
          {/* Execution Statistics - only show in execution mode */}
          {props.mode === "execution" && executionStats && (
            <div className="mb-4 rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900">
              <div className="grid grid-cols-2 gap-6 text-sm sm:grid-cols-3 lg:grid-cols-4">
                <div>
                  <div className="text-neutral-600 dark:text-neutral-400">
                    nReturned
                  </div>
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {executionStats.nReturned.toLocaleString()}
                  </div>
                </div>

                <div>
                  <div className="text-neutral-600 dark:text-neutral-400">
                    totalDocsExamined
                  </div>
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {executionStats.totalDocsExamined.toLocaleString()}
                  </div>
                </div>

                <div>
                  <div className="text-neutral-600 dark:text-neutral-400">
                    totalKeysExamined
                  </div>
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {executionStats.totalKeysExamined.toLocaleString()}
                  </div>
                </div>

                <div>
                  <div className="text-neutral-600 dark:text-neutral-400">
                    executionTimeMillis
                  </div>
                  <div
                    className={`font-semibold ${getTotalTimeColor(executionStats.executionTimeMillis)}`}
                  >
                    {executionStats.executionTimeMillis}ms
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
                    <span>Selectivity</span>
                    <Tooltip content="nReturned / docsExamined">
                      <InfoButton aria-label="Selectivity formula" size="sm" />
                    </Tooltip>
                  </div>
                  <div className="flex items-center">
                    <span
                      className={`font-semibold ${getSelectivityMetric().color}`}
                    >
                      {getSelectivityMetric().value}
                    </span>
                    {getSelectivityMetric().finding && (
                      <Tooltip
                        content={getSelectivityMetric().finding?.description}
                        side="right"
                      >
                        {getSelectivityMetric().finding?.severity ===
                        "critical" ? (
                          <AlertCircle className="ml-1 h-3.5 w-3.5 text-red-500" />
                        ) : (
                          <AlertTriangle className="ml-1 h-3.5 w-3.5 text-orange-500" />
                        )}
                      </Tooltip>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
                    <span>Efficiency</span>
                    <Tooltip content="nReturned / keysExamined">
                      <InfoButton aria-label="Efficiency formula" size="sm" />
                    </Tooltip>
                  </div>
                  <div className="flex items-center">
                    <span
                      className={`font-semibold ${getEfficiencyMetric().color}`}
                    >
                      {getEfficiencyMetric().value}
                    </span>
                    {getEfficiencyMetric().finding && (
                      <Tooltip
                        content={getEfficiencyMetric().finding?.description}
                        side="right"
                      >
                        {getEfficiencyMetric().finding?.severity ===
                        "critical" ? (
                          <AlertCircle className="ml-1 h-3.5 w-3.5 text-red-500" />
                        ) : (
                          <AlertTriangle className="ml-1 h-3.5 w-3.5 text-orange-500" />
                        )}
                      </Tooltip>
                    )}
                  </div>
                </div>

                {sortMetrics && (
                  <>
                    <div>
                      <div className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
                        <span>Has Sort?</span>
                        <Tooltip content="Plan contains SORT operations">
                          <InfoButton
                            aria-label="Has Sort explanation"
                            size="sm"
                          />
                        </Tooltip>
                      </div>
                      <div
                        className={`font-semibold ${sortMetrics.hasSort ? "text-orange-600 dark:text-orange-400" : "text-neutral-900 dark:text-neutral-100"}`}
                      >
                        {sortMetrics.hasSort ? "Yes" : "No"}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
                        <span>In-memory Sort?</span>
                        <Tooltip content="SORT operations use memory instead of indexes">
                          <InfoButton
                            aria-label="In-memory Sort explanation"
                            size="sm"
                          />
                        </Tooltip>
                      </div>
                      <div
                        className={`font-semibold ${sortMetrics.hasInMemorySort ? "text-orange-600 dark:text-orange-400" : "text-neutral-900 dark:text-neutral-100"}`}
                      >
                        {sortMetrics.hasInMemorySort ? "Yes" : "No"}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Flow Visualization */}
          <div className="scrollbar-subtle overflow-auto bg-white p-6 dark:bg-neutral-800">
            <div
              className="relative"
              style={{
                minWidth: width,
                minHeight: Math.max(height, 500),
              }}
            >
              {/* SVG for connections */}
              <svg
                className="pointer-events-none absolute inset-0"
                width="100%"
                height="100%"
                style={{ zIndex: 1 }}
              >
                <FlowConnectorDefs />

                {flowData.layout.connections.map((connection, index) => {
                  const fromStage = flowData.flowStages.find(
                    (s) => s.id === connection.from,
                  );
                  const toStage = flowData.flowStages.find(
                    (s) => s.id === connection.to,
                  );

                  if (!fromStage || !toStage) return null;

                  // Use measured heights from DOM, fallback to calculated
                  const fromHeight =
                    measuredHeights.get(fromStage.id) ??
                    FlowNodeLogic.calculateNodeHeight(fromStage, props.mode);
                  const toHeight =
                    measuredHeights.get(toStage.id) ??
                    FlowNodeLogic.calculateNodeHeight(toStage, props.mode);

                  return (
                    <FlowConnector
                      key={`${connection.from}-${connection.to}-${index}`}
                      connection={connection}
                      fromPosition={{
                        x: fromStage.position.x,
                        y: fromStage.position.y,
                        width: 300,
                        height: fromHeight,
                      }}
                      toPosition={{
                        x: toStage.position.x,
                        y: toStage.position.y,
                        width: 300,
                        height: toHeight,
                      }}
                    />
                  );
                })}
              </svg>

              {/* Flow nodes */}
              <div className="relative" style={{ zIndex: 2 }}>
                {flowData.flowStages.map((flowStage) => (
                  <FlowNode
                    key={flowStage.id}
                    ref={(el) => setNodeRef(flowStage.id, el)}
                    stage={flowStage}
                    events={interactionEvents}
                    engineType={props.engine}
                    mode={props.mode}
                    rootExecutionTimeMillis={rootExecutionTimeMillis}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      }
      jsonContent={<TabJSONViewer data={jsonData} />}
      asciiContent={<TabASCIIViewer content={asciiVisualization} />}
    />
  );
}
