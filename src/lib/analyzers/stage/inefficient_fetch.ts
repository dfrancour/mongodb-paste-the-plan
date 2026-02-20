/**
 * Inefficient Fetch Analyzer
 *
 * Detects FETCH stages where the ratio of documents returned to documents
 * examined is poor, indicating wasted work fetching documents that are
 * then filtered out.
 *
 * A FETCH with poor ratio typically indicates:
 * - Filter conditions that could be evaluated at the index level
 * - Missing covered query opportunities
 * - Index that doesn't cover all filter predicates
 */

import type { StageMetricsAnalyzer, AnalysisFinding } from "../types";
import { AnalyzerIds } from "../types";
import { StageCategory } from "#data/stages/types";

const ANALYZER_ID = AnalyzerIds.stage("inefficient_fetch");

/** Thresholds for fetch efficiency */
const FETCH_THRESHOLDS = {
  /** Below this ratio is concerning (fetching 2x+ more than returning) */
  warning: 0.5,
  /** Below this ratio is critical (fetching 10x+ more than returning) */
  critical: 0.1,
  /** Minimum docs examined to trigger this analyzer */
  minDocsExamined: 10,
} as const;

export const inefficientFetch: StageMetricsAnalyzer = {
  layer: "stage",
  id: ANALYZER_ID,

  name: "Inefficient Fetch Detection",
  description:
    "Identifies FETCH stages that examine many documents but return few, indicating filter inefficiency.",
  enabledByDefault: true,

  analyze: (input) => {
    const findings: AnalysisFinding[] = [];
    const { stage } = input;

    // Only analyze fetch stages with execution metrics
    if (stage.category !== StageCategory.Fetch || !stage.metrics) {
      return findings;
    }

    const docsExamined = stage.metrics.docsExamined;
    const nReturned = stage.metrics.nReturned;

    // Need both metrics to calculate ratio
    if (docsExamined === undefined || nReturned === undefined) {
      return findings;
    }

    // Skip small scans to avoid noise
    if (docsExamined < FETCH_THRESHOLDS.minDocsExamined) {
      return findings;
    }

    const ratio = nReturned / docsExamined;

    if (ratio < FETCH_THRESHOLDS.critical) {
      findings.push({
        id: `inefficient-fetch-${stage.id}`,
        analyzerId: ANALYZER_ID,
        severity: "critical",
        category: "performance",
        metricKey: "efficiency",
        title: "Very Inefficient Document Fetch",
        description:
          `This FETCH stage examined ${docsExamined.toLocaleString()} documents but only returned ` +
          `${nReturned.toLocaleString()} (${(ratio * 100).toFixed(1)}% efficiency). ` +
          "The query is fetching many documents only to filter most of them out.",
        suggestion:
          "Consider creating a covered query where all needed fields are in the index, " +
          "or add the filter fields to the index to push filtering to the index scan stage.",
        affectedStageIds: [stage.id],
        metadata: {
          docsExamined,
          nReturned,
          efficiencyRatio: ratio,
          stageName: stage.stage,
        },
      });
    } else if (ratio < FETCH_THRESHOLDS.warning) {
      findings.push({
        id: `inefficient-fetch-${stage.id}`,
        analyzerId: ANALYZER_ID,
        severity: "warning",
        category: "performance",
        metricKey: "efficiency",
        title: "Inefficient Document Fetch",
        description:
          `This FETCH stage examined ${docsExamined.toLocaleString()} documents but only returned ` +
          `${nReturned.toLocaleString()} (${(ratio * 100).toFixed(1)}% efficiency). ` +
          "Some filter conditions are being evaluated after fetching documents.",
        suggestion:
          "Review if filter conditions can be pushed to the index scan. " +
          "Consider a compound index that includes the filter fields.",
        affectedStageIds: [stage.id],
        metadata: {
          docsExamined,
          nReturned,
          efficiencyRatio: ratio,
          stageName: stage.stage,
        },
      });
    }

    return findings;
  },
} as const;
