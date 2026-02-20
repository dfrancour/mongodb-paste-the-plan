/**
 * Analyzer Registry and Execution Utilities
 *
 * Provides:
 * - Centralized registry for all analyzers
 * - Type-safe lookup functions
 * - Execution utilities for running analyzers
 * - Result aggregation and grouping
 */

import type {
  AnalyzerDefinition,
  StageDefinitionAnalyzer,
  StageMetricsAnalyzer,
  SubtreeAnalyzer,
  PlanAnalyzer,
  AggregationAnalyzer,
  AnalysisFinding,
  AnalysisResults,
  AnalyzerLayer,
  FindingCategory,
  StageDefinitionInput,
  StageInput,
  SubtreeInput,
  PlanInput,
  AggregationInput,
} from "./types";
import {
  isStageDefinitionAnalyzer,
  isStageAnalyzer,
  isSubtreeAnalyzer,
  isPlanAnalyzer,
  isAggregationAnalyzer,
  ANALYZER_LAYERS,
} from "./types";
import type { NormalizedStage } from "#types/explain-plan";

// ============================================================================
// Analyzer Registry
// ============================================================================

// Import explicit analyzer arrays from each layer
import { STAGE_DEFINITION_ANALYZERS } from "./stage-definition";
import { STAGE_ANALYZERS } from "./stage";
import { SUBTREE_ANALYZERS } from "./subtree";
import { PLAN_ANALYZERS } from "./plan";
import { AGGREGATION_ANALYZERS } from "./aggregation";

/** All analyzers as a single array, used for iteration */
const ALL_ANALYZERS: readonly AnalyzerDefinition[] = [
  ...STAGE_DEFINITION_ANALYZERS,
  ...STAGE_ANALYZERS,
  ...SUBTREE_ANALYZERS,
  ...PLAN_ANALYZERS,
  ...AGGREGATION_ANALYZERS,
] as const;

/**
 * Build registry mapping analyzer IDs to definitions.
 * Uses explicit arrays exported from each layer for type safety.
 */
function buildAnalyzerRegistry(): Record<string, AnalyzerDefinition> {
  const registry: Record<string, AnalyzerDefinition> = {};

  for (const analyzer of ALL_ANALYZERS) {
    registry[analyzer.id as string] = analyzer;
  }

  return registry;
}

/**
 * Combined analyzer definitions - typed as a record mapping IDs to definitions
 */
export const ANALYZER_DEFINITIONS: Record<string, AnalyzerDefinition> =
  buildAnalyzerRegistry();

// ============================================================================
// Basic Lookup Utilities
// ============================================================================

export function getAllAnalyzers(): AnalyzerDefinition[] {
  return Object.values(ANALYZER_DEFINITIONS);
}

export function getAnalyzer(id: string): AnalyzerDefinition | undefined {
  return ANALYZER_DEFINITIONS[id];
}

export function getAnalyzersByLayer(
  layer: AnalyzerLayer,
): AnalyzerDefinition[] {
  return getAllAnalyzers().filter((a) => a.layer === layer);
}

export function getEnabledAnalyzers(): AnalyzerDefinition[] {
  return getAllAnalyzers().filter((a) => a.enabledByDefault);
}

// ============================================================================
// Type-Safe Layer-Specific Getters
// ============================================================================

export function getStageDefinitionAnalyzers(): StageDefinitionAnalyzer[] {
  return [...STAGE_DEFINITION_ANALYZERS];
}

export function getStageAnalyzers(): StageMetricsAnalyzer[] {
  return [...STAGE_ANALYZERS];
}

export function getSubtreeAnalyzers(): SubtreeAnalyzer[] {
  return [...SUBTREE_ANALYZERS];
}

export function getPlanAnalyzers(): PlanAnalyzer[] {
  return [...PLAN_ANALYZERS];
}

export function getAggregationAnalyzers(): AggregationAnalyzer[] {
  return [...AGGREGATION_ANALYZERS];
}

// ============================================================================
// Execution Utilities
// ============================================================================

/**
 * Run a single analyzer with its input and return findings.
 * Catches errors to prevent one analyzer from breaking the whole analysis.
 */
function runAnalyzerSafe<T>(
  analyzer: {
    id: { toString(): string };
    analyze: (input: T) => AnalysisFinding[];
  },
  input: T,
): AnalysisFinding[] {
  try {
    return analyzer.analyze(input);
  } catch (error) {
    console.error(`Analyzer ${analyzer.id} failed:`, error);
    return [];
  }
}

export function runStageDefinitionAnalyzers(
  input: StageDefinitionInput,
  analyzers?: StageDefinitionAnalyzer[],
): AnalysisFinding[] {
  const toRun =
    analyzers ??
    getStageDefinitionAnalyzers().filter((a) => a.enabledByDefault);
  return toRun.flatMap((analyzer) => runAnalyzerSafe(analyzer, input));
}

export function runStageAnalyzers(
  input: StageInput,
  analyzers?: StageMetricsAnalyzer[],
): AnalysisFinding[] {
  const toRun =
    analyzers ?? getStageAnalyzers().filter((a) => a.enabledByDefault);
  return toRun.flatMap((analyzer) => runAnalyzerSafe(analyzer, input));
}

export function runSubtreeAnalyzers(
  input: SubtreeInput,
  analyzers?: SubtreeAnalyzer[],
): AnalysisFinding[] {
  const toRun =
    analyzers ?? getSubtreeAnalyzers().filter((a) => a.enabledByDefault);
  return toRun.flatMap((analyzer) => runAnalyzerSafe(analyzer, input));
}

export function runPlanAnalyzers(
  input: PlanInput,
  analyzers?: PlanAnalyzer[],
): AnalysisFinding[] {
  const toRun =
    analyzers ?? getPlanAnalyzers().filter((a) => a.enabledByDefault);
  return toRun.flatMap((analyzer) => runAnalyzerSafe(analyzer, input));
}

export function runAggregationAnalyzers(
  input: AggregationInput,
  analyzers?: AggregationAnalyzer[],
): AnalysisFinding[] {
  const toRun =
    analyzers ?? getAggregationAnalyzers().filter((a) => a.enabledByDefault);
  return toRun.flatMap((analyzer) => runAnalyzerSafe(analyzer, input));
}

// ============================================================================
// Tree Traversal Utilities
// ============================================================================

/**
 * Flatten a stage tree into an array (depth-first, pre-order).
 */
export function flattenStageTree(root: NormalizedStage): NormalizedStage[] {
  const result: NormalizedStage[] = [root];
  for (const child of root.children) {
    result.push(...flattenStageTree(child));
  }
  return result;
}

/**
 * Build ancestors map for efficient lookup.
 * Returns a map from stage ID to array of ancestors (immediate parent first).
 */
export function buildAncestorsMap(
  root: NormalizedStage,
): Map<string, NormalizedStage[]> {
  const map = new Map<string, NormalizedStage[]>();

  function traverse(
    stage: NormalizedStage,
    ancestors: NormalizedStage[],
  ): void {
    map.set(stage.id, ancestors);
    for (const child of stage.children) {
      traverse(child, [stage, ...ancestors]);
    }
  }

  traverse(root, []);
  return map;
}

/**
 * Get the total execution time from the root stage.
 *
 * In MongoDB, executionTimeMillis is cumulative — a parent's time already
 * includes its children's time. The root stage's value represents the total.
 */
export function calculateTotalExecutionTime(
  rootStage: NormalizedStage,
): number {
  return rootStage.metrics?.executionTimeMillis ?? 0;
}

// ============================================================================
// Result Aggregation
// ============================================================================

export function aggregateFindings(
  findings: AnalysisFinding[],
  analyzerDefinitionsRun: number,
): AnalysisResults {
  const bySeverity = {
    critical: findings.filter((f) => f.severity === "critical"),
    warning: findings.filter((f) => f.severity === "warning"),
    info: findings.filter((f) => f.severity === "info"),
  };

  const categories: FindingCategory[] = [
    "performance",
    "indexUsage",
    "memoryUsage",
    "queryPattern",
    "optimization",
  ];

  const byCategory = categories.reduce(
    (acc, cat) => {
      acc[cat] = findings.filter((f) => f.category === cat);
      return acc;
    },
    {} as Record<FindingCategory, AnalysisFinding[]>,
  );

  const byStageId: Record<string, AnalysisFinding[]> = {};
  for (const finding of findings) {
    if (finding.affectedStageIds) {
      for (const stageId of finding.affectedStageIds) {
        if (!byStageId[stageId]) {
          byStageId[stageId] = [];
        }
        byStageId[stageId].push(finding);
      }
    }
  }

  return {
    findings,
    bySeverity,
    byCategory,
    byStageId,
    summary: {
      totalFindings: findings.length,
      criticalCount: bySeverity.critical.length,
      warningCount: bySeverity.warning.length,
      infoCount: bySeverity.info.length,
      analyzerDefinitionsRun,
    },
  };
}

// ============================================================================
// Full Analysis Execution
// ============================================================================

/**
 * Options for running the full analysis.
 */
export interface RunAllAnalyzersOptions {
  /** Specific analyzers to run (defaults to all enabled) */
  analyzers?: AnalyzerDefinition[];
  /** Layers to include (defaults to all) */
  layers?: AnalyzerLayer[];
  /** Skip specific analyzer IDs */
  skipAnalyzers?: string[];
}

/**
 * Run all analyzers on a plan and return aggregated results.
 *
 * This is the main entry point for analysis. It:
 * 1. Flattens the stage tree
 * 2. Builds ancestor mappings
 * 3. Runs analyzers in layer order (stageDefinition → stage → subtree → plan → aggregation)
 * 4. Aggregates all findings
 *
 * @example
 * ```ts
 * const results = runAllAnalyzers({
 *   explainPlan: rawPlan,
 *   rootStage: normalizedRoot,
 * });
 * console.log(results.summary.criticalCount);
 * ```
 */
export function runAllAnalyzers(
  input: {
    explainPlan: PlanInput["explainPlan"];
    rootStage: NormalizedStage;
    esrAnalysis?: PlanInput["esrAnalysis"];
    aggregationPipeline?: AggregationInput["pipeline"];
  },
  options: RunAllAnalyzersOptions = {},
): AnalysisResults {
  const { layers = ANALYZER_LAYERS, skipAnalyzers = [] } = options;
  const findings: AnalysisFinding[] = [];

  // Pre-compute tree traversal data
  const allStages = flattenStageTree(input.rootStage);
  const ancestorsMap = buildAncestorsMap(input.rootStage);
  const totalExecutionTime = calculateTotalExecutionTime(input.rootStage);
  const rootNReturned = input.rootStage.metrics?.nReturned;

  // Filter analyzers by options
  const baseAnalyzers = options.analyzers ?? getEnabledAnalyzers();
  const filteredAnalyzers = baseAnalyzers.filter(
    (a) => layers.includes(a.layer) && !skipAnalyzers.includes(a.id as string),
  );

  let analyzerDefinitionsRun = 0;

  // Layer 1: Stage Definition (static analysis per stage)
  if (layers.includes("stageDefinition")) {
    const sdAnalyzers = filteredAnalyzers.filter(isStageDefinitionAnalyzer);
    for (const stage of allStages) {
      if (stage.definition) {
        const stageFindings = runStageDefinitionAnalyzers(
          { definition: stage.definition, stageId: stage.id },
          sdAnalyzers,
        );
        findings.push(...stageFindings);
      }
    }
    analyzerDefinitionsRun += sdAnalyzers.length;
  }

  // Layer 2: Stage (runtime metrics per stage)
  if (layers.includes("stage")) {
    const sAnalyzers = filteredAnalyzers.filter(isStageAnalyzer);
    for (const stage of allStages) {
      const stageFindings = runStageAnalyzers(
        { stage, rootNReturned, totalExecutionTime },
        sAnalyzers,
      );
      findings.push(...stageFindings);
    }
    analyzerDefinitionsRun += sAnalyzers.length;
  }

  // Layer 3: Subtree (context-aware per stage)
  if (layers.includes("subtree")) {
    const stAnalyzers = filteredAnalyzers.filter(isSubtreeAnalyzer);
    for (const stage of allStages) {
      const ancestors = ancestorsMap.get(stage.id) ?? [];
      const subtreeFindings = runSubtreeAnalyzers(
        {
          stage,
          children: stage.children,
          ancestors,
          rootNReturned,
          totalExecutionTime,
        },
        stAnalyzers,
      );
      findings.push(...subtreeFindings);
    }
    analyzerDefinitionsRun += stAnalyzers.length;
  }

  // Layer 4: Plan (holistic analysis)
  if (layers.includes("plan")) {
    const pAnalyzers = filteredAnalyzers.filter(isPlanAnalyzer);
    const planFindings = runPlanAnalyzers(
      {
        explainPlan: input.explainPlan,
        rootStage: input.rootStage,
        allStages,
        esrAnalysis: input.esrAnalysis,
      },
      pAnalyzers,
    );
    findings.push(...planFindings);
    analyzerDefinitionsRun += pAnalyzers.length;
  }

  // Layer 5: Aggregation (pipeline analysis)
  if (layers.includes("aggregation") && input.aggregationPipeline) {
    const aAnalyzers = filteredAnalyzers.filter(isAggregationAnalyzer);
    const aggFindings = runAggregationAnalyzers(
      { pipeline: input.aggregationPipeline },
      aAnalyzers,
    );
    findings.push(...aggFindings);
    analyzerDefinitionsRun += aAnalyzers.length;
  }

  return aggregateFindings(findings, analyzerDefinitionsRun);
}

export function getFindingsForStage(
  results: AnalysisResults,
  stageId: string,
): AnalysisFinding[] {
  return results.byStageId[stageId] ?? [];
}

export function getMostSevereFinding(
  findings: AnalysisFinding[],
): AnalysisFinding | undefined {
  if (findings.length === 0) return undefined;

  const critical = findings.find((f) => f.severity === "critical");
  if (critical) return critical;

  const warning = findings.find((f) => f.severity === "warning");
  if (warning) return warning;

  return findings[0];
}
