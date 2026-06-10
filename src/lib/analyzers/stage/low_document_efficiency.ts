/**
 * Low Document Efficiency Analyzer
 *
 * Detects stages where the ratio of documents returned to documents examined
 * is very low, indicating that the query is reading much more data than needed.
 *
 * Document Efficiency = nReturned / docsExamined
 *
 * Low document efficiency typically indicates:
 * - Missing or inefficient index
 * - Filter conditions that don't match the index
 * - Queries that naturally need to scan many documents
 */

import type {
  StageMetricsAnalyzer,
  AnalysisFinding,
  FindingSeverity,
} from "../types";
import { AnalyzerIds } from "../types";

const ANALYZER_ID = AnalyzerIds.stage("low_document_efficiency");

/** Thresholds for document efficiency severity levels */
const DOCUMENT_EFFICIENCY_THRESHOLDS = {
  /** Below this is critical (examining 100x+ more docs than returned) */
  critical: 0.01,
  /** Below this is warning (examining 10x+ more docs than returned) */
  warning: 0.1,
} as const;

/** Minimum docs examined to trigger this analyzer (avoid noise on small scans) */
const MIN_DOCS_EXAMINED = 100;

export const lowDocumentEfficiency: StageMetricsAnalyzer = {
  layer: "stage",
  id: ANALYZER_ID,

  name: "Low Document Efficiency Detection",
  description:
    "Identifies stages with poor document efficiency where many documents are examined to return few.",
  enabledByDefault: true,

  analyze: (input) => {
    const findings: AnalysisFinding[] = [];
    const { stage } = input;

    if (!stage.metrics) return findings;

    const docsExamined = stage.metrics.docsExamined;
    const nReturned = stage.metrics.nReturned;

    // Need both metrics to calculate document efficiency
    if (docsExamined === undefined || nReturned === undefined) {
      return findings;
    }

    // Skip if docs examined is below threshold (avoid noise on small scans)
    if (docsExamined < MIN_DOCS_EXAMINED) {
      return findings;
    }

    const documentEfficiency = nReturned / docsExamined;

    let severity: FindingSeverity;
    if (documentEfficiency < DOCUMENT_EFFICIENCY_THRESHOLDS.critical) {
      severity = "critical";
    } else if (documentEfficiency < DOCUMENT_EFFICIENCY_THRESHOLDS.warning) {
      severity = "warning";
    } else {
      return findings;
    }

    const documentEfficiencyPercentage = (documentEfficiency * 100).toFixed(2);
    const ratio = Math.round(docsExamined / Math.max(nReturned, 1));

    findings.push({
      id: `low-document-efficiency-${stage.id}`,
      analyzerId: ANALYZER_ID,
      severity,
      category: "performance",
      metricKey: "documentEfficiency",
      title: "Low Document Efficiency",
      description:
        `This stage examined ${docsExamined.toLocaleString()} documents to return ${nReturned.toLocaleString()} ` +
        `(${documentEfficiencyPercentage}% document efficiency). MongoDB is reading ~${ratio}x more data than needed.`,
      suggestion:
        documentEfficiency < DOCUMENT_EFFICIENCY_THRESHOLDS.critical
          ? "This is critically inefficient. Consider adding a compound index that covers the filter fields, " +
            "or restructuring the query to be more selective."
          : "Consider improving index coverage for the filter conditions used in this query stage.",
      affectedStageIds: [stage.id],
      metadata: {
        documentEfficiency,
        documentEfficiencyPercentage: parseFloat(documentEfficiencyPercentage),
        docsExamined,
        nReturned,
        examinedToReturnedRatio: ratio,
      },
    });

    return findings;
  },
} as const;
