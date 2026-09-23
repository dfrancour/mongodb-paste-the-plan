/**
 * Finding types for slow-query log analysis.
 *
 * Shares severity and category vocabulary with explain-plan findings
 * (`#types/analysis`) so both tools render findings the same way, while
 * the analyzer layers are specific to logs: one entry, one group, or the
 * whole workload.
 */

import type { FindingCategory, FindingSeverity } from "./analysis";

type SlowQueryAnalyzerLayer = "entry" | "group" | "workload";

export interface SlowQueryFinding {
  /** Unique within its subject (entry, group, or workload). */
  readonly id: string;
  readonly analyzerId: string;
  readonly layer: SlowQueryAnalyzerLayer;
  readonly severity: FindingSeverity;
  readonly category: FindingCategory;
  readonly title: string;
  readonly description: string;
  readonly suggestion?: string;
}
