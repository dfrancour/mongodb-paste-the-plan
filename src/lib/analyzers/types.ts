/**
 * Type system for MongoDB Explain Plan Analyzers
 *
 * This module defines the analyzer framework with 5 distinct layers:
 * 1. Stage Definition - Static analysis from stage type (e.g., COLLSCAN is anti-pattern)
 * 2. Stage - Runtime metrics analysis (e.g., low selectivity, high execution time)
 * 3. Subtree - Context-aware analysis with children/ancestors
 * 4. Plan - Holistic plan analysis (e.g., ESR compliance, overall efficiency)
 * 5. Aggregation - Pipeline ordering analysis (e.g., $match after $project)
 *
 * Pure output types (AnalysisFinding, AnalysisResults, branded IDs) live in
 * #types/analysis.ts to keep dependency direction clean (types → types, not types → lib).
 */

import type {
  NormalizedStage,
  ExplainPlan,
  ESRAnalysis,
} from "#types/explain-plan";
import type { StageDefinition } from "#data/stages/types";

// Re-export pure output types from #types/analysis.ts
export type {
  StageDefinitionAnalyzerId,
  StageAnalyzerId,
  SubtreeAnalyzerId,
  PlanAnalyzerId,
  AggregationAnalyzerId,
  AnalyzerId,
  AnalyzerLayer,
  FindingSeverity,
  FindingCategory,
  MetricKey,
  AnalysisFinding,
  AnalysisResults,
} from "#types/analysis";

import type {
  StageDefinitionAnalyzerId,
  StageAnalyzerId,
  SubtreeAnalyzerId,
  PlanAnalyzerId,
  AggregationAnalyzerId,
  AnalyzerLayer,
  AnalysisFinding,
} from "#types/analysis";

/** Helper to create branded analyzer IDs with layer prefix for identification */
export const AnalyzerIds = {
  stageDefinition: (id: string) =>
    `stageDefinition:${id}` as StageDefinitionAnalyzerId,
  stage: (id: string) => `stage:${id}` as StageAnalyzerId,
  subtree: (id: string) => `subtree:${id}` as SubtreeAnalyzerId,
  plan: (id: string) => `plan:${id}` as PlanAnalyzerId,
  aggregation: (id: string) => `aggregation:${id}` as AggregationAnalyzerId,
} as const;

// ============================================================================
// Analyzer Input Types
// ============================================================================

/**
 * Input for Stage Definition analyzers.
 * Static analysis based on stage type - no runtime metrics needed.
 */
export interface StageDefinitionInput {
  /** The stage definition from the glossary */
  definition: StageDefinition;
  /** The stage ID (for finding association) */
  stageId: string;
}

/**
 * Input for Stage analyzers.
 * Runtime analysis of a single stage's metrics.
 */
export interface StageInput {
  /** The normalized stage with metrics */
  stage: NormalizedStage;
  /** Root nReturned for calculating selectivity ratios */
  rootNReturned?: number;
  /** Total execution time for calculating time percentages */
  totalExecutionTime?: number;
}

/**
 * Input for Subtree analyzers.
 * Context-aware analysis with access to children and ancestors.
 */
export interface SubtreeInput {
  /** The current stage */
  stage: NormalizedStage;
  /** Direct children of this stage */
  children: NormalizedStage[];
  /** All ancestors from this stage to root (immediate parent first) */
  ancestors: NormalizedStage[];
  /** Root nReturned for calculating selectivity ratios */
  rootNReturned?: number;
  /** Total execution time for calculating time percentages */
  totalExecutionTime?: number;
}

/**
 * Input for Plan analyzers.
 * Holistic analysis of the entire execution plan.
 */
export interface PlanInput {
  /** The raw explain plan */
  explainPlan: ExplainPlan;
  /** The normalized root stage */
  rootStage: NormalizedStage;
  /** All normalized stages as a flat array */
  allStages: NormalizedStage[];
  /** ESR analysis results (if applicable) */
  esrAnalysis?: ESRAnalysis;
}

/**
 * Aggregation pipeline stage for aggregation analyzers.
 * This is a simplified view of pipeline stages for ordering analysis.
 */
export interface AggregationPipelineStage {
  /** The stage name (e.g., "$match", "$project") */
  stage: string;
  /** Position in the pipeline (0-indexed) */
  position: number;
  /** The stage specification */
  spec: Record<string, unknown>;
}

export interface AggregationInput {
  /** The aggregation pipeline stages in order */
  pipeline: AggregationPipelineStage[];
}

// ============================================================================
// Analyzer Definition Types - Discriminated Union
// ============================================================================

interface BaseAnalyzerMetadata {
  /** Human-readable name */
  name: string;
  /** Description of what this analyzer checks */
  description: string;
  /** Whether this analyzer is enabled by default */
  enabledByDefault: boolean;
}

/** Stage Definition analyzer - static analysis from stage type */
export interface StageDefinitionAnalyzer extends BaseAnalyzerMetadata {
  layer: "stageDefinition";
  id: StageDefinitionAnalyzerId;
  analyze: (input: StageDefinitionInput) => AnalysisFinding[];
}

/** Stage analyzer - runtime metrics analysis */
export interface StageMetricsAnalyzer extends BaseAnalyzerMetadata {
  layer: "stage";
  id: StageAnalyzerId;
  analyze: (input: StageInput) => AnalysisFinding[];
}

/** Subtree analyzer - context-aware analysis with children/ancestors */
export interface SubtreeAnalyzer extends BaseAnalyzerMetadata {
  layer: "subtree";
  id: SubtreeAnalyzerId;
  analyze: (input: SubtreeInput) => AnalysisFinding[];
}

/** Plan analyzer - holistic plan analysis */
export interface PlanAnalyzer extends BaseAnalyzerMetadata {
  layer: "plan";
  id: PlanAnalyzerId;
  analyze: (input: PlanInput) => AnalysisFinding[];
}

export interface AggregationAnalyzer extends BaseAnalyzerMetadata {
  layer: "aggregation";
  id: AggregationAnalyzerId;
  analyze: (input: AggregationInput) => AnalysisFinding[];
}

/** Discriminated union of all analyzer types */
export type AnalyzerDefinition =
  | StageDefinitionAnalyzer
  | StageMetricsAnalyzer
  | SubtreeAnalyzer
  | PlanAnalyzer
  | AggregationAnalyzer;

// ============================================================================
// Type Guards
// ============================================================================

export function isStageDefinitionAnalyzer(
  analyzer: AnalyzerDefinition,
): analyzer is StageDefinitionAnalyzer {
  return analyzer.layer === "stageDefinition";
}

export function isStageAnalyzer(
  analyzer: AnalyzerDefinition,
): analyzer is StageMetricsAnalyzer {
  return analyzer.layer === "stage";
}

export function isSubtreeAnalyzer(
  analyzer: AnalyzerDefinition,
): analyzer is SubtreeAnalyzer {
  return analyzer.layer === "subtree";
}

export function isPlanAnalyzer(
  analyzer: AnalyzerDefinition,
): analyzer is PlanAnalyzer {
  return analyzer.layer === "plan";
}

export function isAggregationAnalyzer(
  analyzer: AnalyzerDefinition,
): analyzer is AggregationAnalyzer {
  return analyzer.layer === "aggregation";
}

// ============================================================================
// Analyzer Layer Constants
// ============================================================================

export const ANALYZER_LAYERS: readonly AnalyzerLayer[] = [
  "stageDefinition",
  "stage",
  "subtree",
  "plan",
  "aggregation",
];
