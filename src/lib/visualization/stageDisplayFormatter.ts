/**
 * Stage Display Formatter
 *
 * Provides display formatting for MongoDB execution stages.
 * This is pure presentation logic - transforms stage data into display-ready formats.
 *
 * For analysis logic (performance levels, warnings, suggestions),
 * use the modular analyzer system in #lib/analyzers/.
 */

import type { NormalizedStage } from "#types/explain-plan";
import type { FlowStage } from "#types/flow-visualization";
import type { StageVisualization } from "#types/visualization";
import type { AnalysisResults } from "#lib/analyzers";
import {
  getPerformanceLevelFromFindings,
  getAllWarningsFromFindings,
  getSuggestionFromFindings,
  getFindingsForStage,
} from "#lib/analyzers";
import { StageCategory } from "#data/stages";

/**
 * Create a StageVisualization by combining modular analyzer results with display formatting.
 *
 * This replaces StageAnalyzer.analyzeStage() by using the modular analyzer system
 * for analysis (performance level, warnings, suggestions) and the display formatter
 * for presentation (metrics, context info).
 *
 * @param stage - The normalized stage to visualize
 * @param analysisResults - Pre-computed analysis results from runAllAnalyzers()
 */
export function createStageVisualization(
  stage: NormalizedStage,
  analysisResults: AnalysisResults,
): StageVisualization {
  const displayMetrics = extractDisplayMetrics(stage);
  const stageFindings = getFindingsForStage(analysisResults, stage.id);
  const performanceLevel = getPerformanceLevelFromFindings(stageFindings);
  const warnings = getAllWarningsFromFindings(stageFindings);
  const optimizationSuggestion = getSuggestionFromFindings(stageFindings);

  return {
    performanceLevel,
    primaryMetric: displayMetrics.primary,
    secondaryMetric: displayMetrics.secondary,
    warnings,
    optimizationSuggestion,
  };
}

/**
 * Grid metrics for consistent stage display
 */
export interface StageGridMetrics {
  flowMetrics: {
    input: string;
    output: string;
    direction: string;
  };
  coreMetrics: {
    keys: { value: string; color: string };
    docs: { value: string; color: string };
    time: { value: string; color: string };
  };
  contextInfo: {
    primary: string;
    secondary: string;
  };
  performanceIndicators: {
    selectivity: { value: string; color: string };
    efficiency: { value: string; color: string };
    workRatio: { value: string; color: string };
  };
}

/**
 * Simple display metrics (primary/secondary strings)
 */
export interface DisplayMetrics {
  primary: string;
  secondary?: string;
}

/** Warning info with metricKey for coloring */
interface WarningForColoring {
  severity: "warning" | "critical";
  metricKey?: string;
}

/**
 * Get color for a metric based on warnings.
 * Returns red for critical, orange for warning, neutral otherwise.
 */
function getColorFromWarnings(
  metricKey: string,
  warnings: readonly WarningForColoring[],
): string {
  const warning = warnings.find((w) => w.metricKey === metricKey);
  if (!warning) return "text-gray-900 dark:text-gray-100";
  if (warning.severity === "critical") return "text-red-600 dark:text-red-400";
  return "text-orange-600 dark:text-orange-400";
}

/**
 * Extract consistent grid metrics for all stages.
 * Colors are determined by warnings from the analyzer system.
 */
export function extractGridMetrics(
  stage: NormalizedStage | FlowStage,
): StageGridMetrics {
  const metrics = stage.metrics ?? {};

  // Get warnings if this is a FlowStage with visualization data
  const warnings: readonly WarningForColoring[] =
    "visualization" in stage && stage.visualization.warnings
      ? stage.visualization.warnings
      : [];

  // Flow Metrics - consistent input/output representation
  const flowMetrics = {
    input: getInputCount(stage),
    output: metrics.nReturned?.toLocaleString() ?? "0",
    direction: "→",
  };

  // Core Metrics - fundamental performance data with semantic coloring from warnings
  const coreMetrics = {
    keys: {
      value: metrics.keysExamined?.toLocaleString() ?? "—",
      color: getColorFromWarnings("keysExamined", warnings),
    },
    docs: {
      value: metrics.docsExamined?.toLocaleString() ?? "—",
      color: getColorFromWarnings("docsExamined", warnings),
    },
    time: {
      value:
        metrics.executionTimeMillis !== undefined
          ? `${metrics.executionTimeMillis}ms`
          : "—",
      color: getColorFromWarnings("executionTime", warnings),
    },
  };

  // Context Info - stage-specific but consistently positioned
  const contextInfo = {
    primary: getContextInfo(stage),
    secondary: getWorkInfo(stage),
  };

  // Performance Indicators - calculated ratios with colors from warnings
  const performanceIndicators = {
    selectivity: {
      value: getSelectivityRatio(stage),
      color: getColorFromWarnings("selectivity", warnings),
    },
    efficiency: {
      value: getEfficiencyRatio(stage),
      color: getColorFromWarnings("efficiency", warnings),
    },
    workRatio: {
      value: getWorkRatio(stage),
      color: getColorFromWarnings("workRatio", warnings),
    },
  };

  return {
    flowMetrics,
    coreMetrics,
    contextInfo,
    performanceIndicators,
  };
}

/**
 * Extract simple display metrics for a stage
 */
export function extractDisplayMetrics(stage: NormalizedStage): DisplayMetrics {
  const metrics = stage.metrics ?? {};
  const nReturned = metrics.nReturned?.toLocaleString() ?? "0";
  const docsExamined = metrics.docsExamined?.toLocaleString() ?? "0";

  return {
    primary: `${docsExamined} → ${nReturned}`,
    secondary: getContextInfo(stage),
  };
}

/**
 * Get input count for flow metrics
 */
function getInputCount(stage: NormalizedStage): string {
  const metrics = stage.metrics ?? {};

  // For leaf stages, show the examination count
  if (stage.children.length === 0) {
    return (
      metrics.docsExamined?.toLocaleString() ??
      metrics.keysExamined?.toLocaleString() ??
      "—"
    );
  }

  // For non-leaf stages, sum children's output
  const childrenOutput = stage.children.reduce((sum, child) => {
    return sum + (child.metrics?.nReturned ?? 0);
  }, 0);

  return childrenOutput > 0 ? childrenOutput.toLocaleString() : "—";
}

/**
 * Get stage-specific context information
 */
export function getContextInfo(stage: NormalizedStage): string {
  // Index scans - show index name and bounds
  if (stage.category === StageCategory.IndexScan) {
    const indexInfo = stage.structure?.indexName ?? "unknown index";
    const indexBounds = extractIndexBounds(stage);
    return indexBounds ? `${indexInfo} (${indexBounds})` : indexInfo;
  }

  // Collection scans - show filter info if available
  if (stage.category === StageCategory.CollectionScan) {
    const filterInfo = extractFilterInfo(stage);
    return filterInfo ? `collection scan: ${filterInfo}` : "collection scan";
  }

  // Fetch stages - show filter info
  if (stage.category === StageCategory.Fetch) {
    const fetchFilter = extractFilterInfo(stage);
    return fetchFilter ? `fetch: ${fetchFilter}` : "document fetch";
  }

  // Sort stages
  if (stage.category === StageCategory.Sort) {
    return "sort operation";
  }

  // Join stages
  if (stage.category === StageCategory.Join) {
    return "join operation";
  }

  // Text search stages
  if (stage.category === StageCategory.TextSearch) {
    return "text search";
  }

  // Aggregation stages
  if (stage.category === StageCategory.Aggregation) {
    return "aggregation";
  }

  // Transformation stages
  if (stage.category === StageCategory.Transformation) {
    return "transformation";
  }

  // Special case: SHARD_MERGE (internal stage)
  if (stage.stage === "SHARD_MERGE") {
    return `${stage.children.length} shards`;
  }

  // Default: use fullName from definition or lowercase stage name
  return stage.definition?.fullName?.toLowerCase() ?? stage.stage.toLowerCase();
}

/**
 * Extract readable filter information from stage
 */
function extractFilterInfo(stage: NormalizedStage): string | null {
  const filter = stage.structure?.filter;

  if (!filter || typeof filter !== "object" || filter === null) {
    return null;
  }

  try {
    // Handle $and filters
    if ("$and" in filter && Array.isArray(filter.$and)) {
      const conditions = filter.$and
        .map((condition) => parseCondition(condition))
        .filter(Boolean);
      return conditions.length > 0 ? conditions.join(" AND ") : null;
    }

    // Handle $or filters
    if ("$or" in filter && Array.isArray(filter.$or)) {
      const conditions = filter.$or
        .map((condition) => parseCondition(condition))
        .filter(Boolean);
      return conditions.length > 0 ? conditions.join(" OR ") : null;
    }

    // Handle simple object filters
    return parseCondition(filter);
  } catch {
    return "complex filter";
  }
}

/**
 * Extract readable index bounds information
 */
function extractIndexBounds(stage: NormalizedStage): string | null {
  const indexBounds = stage.structure?.indexBounds;

  if (!indexBounds || typeof indexBounds !== "object" || indexBounds === null) {
    return null;
  }

  try {
    const bounds = Object.entries(indexBounds as Record<string, unknown>)
      .map(([field, boundsValue]) => {
        if (Array.isArray(boundsValue) && boundsValue.length > 0) {
          for (const bound of boundsValue) {
            if (typeof bound === "string") {
              const cleanBound = bound
                .replace(/^\[|\]$/g, "")
                .replace(/"/g, "");
              const parts = cleanBound.split(", ");
              const min = parts[0];
              const max = parts[1];
              return min === max
                ? `${field}=${min ?? ""}`
                : `${field}:${min ?? ""}..${max ?? ""}`;
            }
            break;
          }
        }
        return `${field}:range`;
      })
      .filter(Boolean);

    return bounds.length > 0 ? bounds.join(", ") : null;
  } catch {
    return "index bounds";
  }
}

/**
 * Parse individual filter condition
 */
function parseCondition(condition: unknown): string | null {
  if (!condition || typeof condition !== "object" || condition === null) {
    return null;
  }

  try {
    const entries = Object.entries(condition as Record<string, unknown>);
    return entries
      .map(([field, value]) => {
        if (typeof value === "object" && value !== null) {
          const operators = Object.entries(value as Record<string, unknown>)
            .map(([op, val]) => {
              switch (op) {
                case "$eq":
                  return `${field}=${String(val)}`;
                case "$gte":
                  return `${field}>=${String(val)}`;
                case "$gt":
                  return `${field}>${String(val)}`;
                case "$lte":
                  return `${field}<=${String(val)}`;
                case "$lt":
                  return `${field}<${String(val)}`;
                case "$in":
                  return `${field} IN (${Array.isArray(val) ? val.slice(0, 3).map(String).join(",") : String(val)})`;
                case "$ne":
                  return `${field}!=${String(val)}`;
                case "$exists":
                  return `${field} exists`;
                case "$regex":
                  return `${field} matches pattern`;
                default:
                  return `${field}:${op}`;
              }
            })
            .filter(Boolean);
          return operators.length > 0 ? operators.join(" ") : null;
        }
        return `${field}=${String(value)}`;
      })
      .filter(Boolean)
      .join(" AND ");
  } catch {
    return null;
  }
}

/**
 * Get work cycle information
 */
function getWorkInfo(stage: NormalizedStage): string {
  const metrics = stage.metrics ?? {};
  const works = metrics.works;
  const advanced = metrics.advanced;
  const needTime = metrics.needTime;

  if (works !== undefined && works > 0) {
    return `${works.toLocaleString()} work cycles`;
  }

  if (advanced !== undefined && needTime !== undefined) {
    const total = advanced + needTime;
    return total > 0 ? `${total.toLocaleString()} operations` : "—";
  }

  return "—";
}

/**
 * Calculate selectivity ratio
 */
function getSelectivityRatio(stage: NormalizedStage): string {
  const metrics = stage.metrics ?? {};
  const efficiency = "efficiency" in stage ? stage.efficiency : undefined;

  if (efficiency?.selectivity !== undefined) {
    return `${(efficiency.selectivity * 100).toFixed(1)}%`;
  }

  // Fallback calculation
  const nReturned = metrics.nReturned ?? 0;
  const docsExamined = metrics.docsExamined ?? 0;

  if (docsExamined > 0) {
    const selectivity = nReturned / docsExamined;
    return `${(selectivity * 100).toFixed(1)}%`;
  }

  return "—";
}

/**
 * Calculate efficiency ratio (nReturned / keysExamined)
 */
function getEfficiencyRatio(stage: NormalizedStage): string {
  const metrics = stage.metrics ?? {};
  const nReturned = metrics.nReturned ?? 0;
  const keysExamined = metrics.keysExamined ?? 0;

  if (keysExamined > 0) {
    const efficiency = nReturned / keysExamined;
    return `${(efficiency * 100).toFixed(1)}%`;
  }

  return "—";
}

/**
 * Calculate work efficiency ratio
 */
function getWorkRatio(stage: NormalizedStage): string {
  const metrics = stage.metrics ?? {};
  const advanced = metrics.advanced;
  const needTime = metrics.needTime;

  if (
    advanced !== undefined &&
    needTime !== undefined &&
    advanced + needTime > 0
  ) {
    const efficiency = advanced / (advanced + needTime);
    return `${(efficiency * 100).toFixed(0)}%`;
  }

  return "—";
}
