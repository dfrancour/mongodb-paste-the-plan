/**
 * Visualization Adapter
 *
 * Bridges the analyzer domain (AnalysisFinding) with the visualization domain
 * (PerformanceLevel, StageWarning). This module translates analysis results
 * into display-ready data for the flow visualization components.
 *
 * Also includes sort detection utilities used by FlowVisualization.
 */

import type { AnalysisFinding, AnalysisResults, AnalyzerLayer } from "./types";
import type { PerformanceLevel, StageWarning } from "#types/visualization";
import type { NormalizedStage } from "#types/explain-plan";
import { StageCategory } from "#data/stages/types";
import { COVERED_QUERY_ANALYZER_ID } from "./stage-definition";
import {
  IN_MEMORY_SORT_ANALYZER_ID,
  IN_MEMORY_SORT_FINDING_PREFIX,
} from "./plan";
import { getMostSevereFinding, getAnalyzer } from "./analyzer_utilities";

// ============================================================================
// Performance Level Mapping
// ============================================================================

/**
 * Maps finding severity to performance level.
 * "optimal" is a special case - it requires an explicit "info" finding with positive context.
 */
function severityToPerformanceLevel(
  severity: AnalysisFinding["severity"] | undefined,
  hasOptimalFinding: boolean,
): PerformanceLevel {
  if (hasOptimalFinding) return "optimal";
  if (!severity) return "good";

  switch (severity) {
    case "critical":
      return "critical";
    case "warning":
      return "warning";
    case "info":
      return "good";
    default:
      return "good";
  }
}

/**
 * Derive performance level from findings for a specific stage.
 * Returns "good" if no findings exist for the stage.
 */
export function getPerformanceLevelFromFindings(
  findings: AnalysisFinding[],
): PerformanceLevel {
  if (findings.length === 0) return "good";

  // Check for optimal indicator (covered query detection)
  const hasOptimalFinding = findings.some(
    (f) => f.severity === "info" && f.analyzerId === COVERED_QUERY_ANALYZER_ID,
  );

  const mostSevere = getMostSevereFinding(findings);
  return severityToPerformanceLevel(mostSevere?.severity, hasOptimalFinding);
}

// ============================================================================
// Warning Extraction
// ============================================================================

/**
 * Get ALL warnings from findings (not just most severe).
 * Returns array of warnings, sorted by severity (critical first).
 */
export function getAllWarningsFromFindings(
  findings: AnalysisFinding[],
): StageWarning[] {
  return findings
    .filter((f) => f.severity === "critical" || f.severity === "warning")
    .sort((a, b) => {
      // Sort critical before warning
      if (a.severity === "critical" && b.severity !== "critical") return -1;
      if (b.severity === "critical" && a.severity !== "critical") return 1;
      return 0;
    })
    .map((f) => ({
      title: f.title,
      description: f.description,
      severity: f.severity as "warning" | "critical",
      suggestion: f.suggestion,
      layer: getAnalyzerLayer(f.analyzerId),
      category: f.category,
      metricKey: f.metricKey,
    }));
}

/**
 * Look up the layer for an analyzer by its ID via the registry.
 * Falls back to "stage" if the analyzer is not found.
 */
function getAnalyzerLayer(analyzerId: string): AnalyzerLayer {
  return getAnalyzer(analyzerId)?.layer ?? "stage";
}

/**
 * Get optimization suggestion from findings.
 * Returns the suggestion from the most severe finding.
 */
export function getSuggestionFromFindings(
  findings: AnalysisFinding[],
): string | undefined {
  const mostSevere = getMostSevereFinding(findings);
  return mostSevere?.suggestion;
}

// ============================================================================
// Sort Detection Utilities
// ============================================================================

/**
 * Check if any stage in the tree has a Sort category.
 */
export function hasAnySortStage(stages: NormalizedStage[]): boolean {
  for (const stage of stages) {
    if (stage.category === StageCategory.Sort) {
      return true;
    }
    if (hasAnySortStage(stage.children)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if the analysis results contain any in-memory sort findings.
 */
export function hasInMemorySortFinding(results: AnalysisResults): boolean {
  return results.findings.some(
    (f) =>
      f.analyzerId === IN_MEMORY_SORT_ANALYZER_ID ||
      f.id.startsWith(IN_MEMORY_SORT_FINDING_PREFIX),
  );
}

/**
 * Get sort metrics from analysis results and stage tree.
 */
export function getSortMetrics(
  stages: NormalizedStage[],
  results: AnalysisResults,
): { hasSort: boolean; hasInMemorySort: boolean } {
  return {
    hasSort: hasAnySortStage(stages),
    hasInMemorySort: hasInMemorySortFinding(results),
  };
}
