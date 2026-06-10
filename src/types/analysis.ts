/**
 * Analysis Output Types
 *
 * Pure type definitions for analysis findings and results.
 * These types are consumed across layers (types, lib, components),
 * so they live in ~/types/ to maintain clean dependency direction.
 *
 * Analyzer-specific types (inputs, definitions, type guards) remain
 * in #lib/analyzers/types.ts.
 */

// ============================================================================
// Branded Analyzer IDs
// ============================================================================

type Brand<K, T> = K & { readonly __brand: T };

/** Branded ID for stage definition analyzers */
export type StageDefinitionAnalyzerId = Brand<
  string,
  "StageDefinitionAnalyzer"
>;

/** Branded ID for stage analyzers */
export type StageAnalyzerId = Brand<string, "StageAnalyzer">;

/** Branded ID for subtree analyzers */
export type SubtreeAnalyzerId = Brand<string, "SubtreeAnalyzer">;

/** Branded ID for plan analyzers */
export type PlanAnalyzerId = Brand<string, "PlanAnalyzer">;

/** Branded ID for aggregation analyzers */
export type AggregationAnalyzerId = Brand<string, "AggregationAnalyzer">;

/** Union of all analyzer ID types */
export type AnalyzerId =
  | StageDefinitionAnalyzerId
  | StageAnalyzerId
  | SubtreeAnalyzerId
  | PlanAnalyzerId
  | AggregationAnalyzerId;

// ============================================================================
// Analyzer Layers
// ============================================================================

/** The 5 layers of the analyzer framework */
export type AnalyzerLayer =
  | "stageDefinition"
  | "stage"
  | "subtree"
  | "plan"
  | "aggregation";

// ============================================================================
// Finding Severity and Category
// ============================================================================

/** Severity levels for analysis findings */
export type FindingSeverity = "info" | "warning" | "critical";

/** Categories for analysis findings */
export type FindingCategory =
  | "performance"
  | "indexUsage"
  | "memoryUsage"
  | "queryPattern"
  | "optimization";

/** Keys for display metrics that findings can be associated with */
export type MetricKey =
  | "documentEfficiency"
  | "indexEfficiency"
  | "executionTime";

// ============================================================================
// Unified Finding Output
// ============================================================================

/**
 * The unified output type for all analyzers.
 * Each analyzer produces zero or more findings.
 */
export interface AnalysisFinding {
  /** Unique ID for this finding instance (e.g., "collscan-stage-1") */
  id: string;
  /** ID of the analyzer that produced this finding */
  analyzerId: AnalyzerId;
  /** Severity of the finding */
  severity: FindingSeverity;
  /** Category of the finding */
  category: FindingCategory;
  /** Short title for the finding */
  title: string;
  /** Detailed description of the finding */
  description: string;
  /** Optional suggestion for addressing the finding */
  suggestion?: string;
  /** IDs of stages affected by this finding (for UI highlighting) */
  affectedStageIds?: string[];
  /** Which display metric this finding relates to (for inline indicators) */
  metricKey?: MetricKey;
  /** Optional additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Analysis Results
// ============================================================================

/** Results from running all analyzers */
export interface AnalysisResults {
  /** All findings from all analyzers */
  findings: AnalysisFinding[];
  /** Findings grouped by severity */
  bySeverity: {
    critical: AnalysisFinding[];
    warning: AnalysisFinding[];
    info: AnalysisFinding[];
  };
  /** Findings grouped by category */
  byCategory: Record<FindingCategory, AnalysisFinding[]>;
  /** Findings grouped by affected stage ID */
  byStageId: Record<string, AnalysisFinding[]>;
  /** Summary statistics */
  summary: {
    totalFindings: number;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    /** Count of unique analyzer definitions that were executed (not total invocations) */
    analyzerDefinitionsRun: number;
  };
}
