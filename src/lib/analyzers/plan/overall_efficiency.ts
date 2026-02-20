/**
 * Overall Efficiency Analyzer
 *
 * Analyzes the holistic efficiency of the query plan by comparing
 * work done (documents/keys examined) to results produced (nReturned).
 *
 * This provides a plan-level view of how efficiently MongoDB is
 * executing the query, complementing the per-stage analysis.
 *
 * Key metrics:
 * - Document Efficiency: nReturned / totalDocsExamined
 * - Key Efficiency: nReturned / totalKeysExamined
 * - Work Efficiency: advanced / works (MongoDB's internal productivity metric)
 */

import type { PlanAnalyzer, AnalysisFinding, FindingSeverity } from "../types";
import { AnalyzerIds } from "../types";

const ANALYZER_ID = AnalyzerIds.plan("overall_efficiency");

/** Thresholds for efficiency severity levels */
const EFFICIENCY_THRESHOLDS = {
  /** Document efficiency below this is critical */
  docCritical: 0.01, // 1% - examining 100x more docs than returned
  /** Document efficiency below this is warning */
  docWarning: 0.1, // 10% - examining 10x more docs than returned
  /** Key efficiency below this is warning (keys are cheaper than docs) */
  keyWarning: 0.01, // 1% - more lenient for key examination
  /** Work efficiency (advanced/works) below this is warning */
  workWarning: 0.5, // 50% of work is productive
  /** Minimum documents examined to trigger analysis */
  minDocsExamined: 100,
} as const;

export const overallEfficiency: PlanAnalyzer = {
  layer: "plan",
  id: ANALYZER_ID,

  name: "Overall Plan Efficiency",
  description:
    "Evaluates the holistic efficiency of the query plan by comparing work done to results.",
  enabledByDefault: true,

  analyze: (input) => {
    const findings: AnalysisFinding[] = [];
    const { rootStage, allStages, explainPlan } = input;

    // Extract plan-level metrics
    const executionStats =
      "executionStats" in explainPlan ? explainPlan.executionStats : undefined;

    // Collect aggregate metrics from execution stats or stages
    const totalDocsExamined =
      executionStats?.totalDocsExamined ??
      allStages.reduce((sum, s) => sum + (s.metrics?.docsExamined ?? 0), 0);

    const totalKeysExamined =
      executionStats?.totalKeysExamined ??
      allStages.reduce((sum, s) => sum + (s.metrics?.keysExamined ?? 0), 0);

    const nReturned =
      executionStats?.nReturned ?? rootStage.metrics?.nReturned ?? 0;

    // Collect works/advanced from stages.
    // Note: works/advanced are cumulative (parent includes children), so summing
    // over-counts both numerator and denominator. The ratio (advanced/works) is
    // approximately self-correcting since both inflate by the same factor.
    const totalWorks = allStages.reduce(
      (sum, s) => sum + (s.metrics?.works ?? 0),
      0,
    );
    const totalAdvanced = allStages.reduce(
      (sum, s) => sum + (s.metrics?.advanced ?? 0),
      0,
    );

    // Calculate efficiencies
    const docEfficiency =
      totalDocsExamined > 0 ? nReturned / totalDocsExamined : undefined;
    const keyEfficiency =
      totalKeysExamined > 0 ? nReturned / totalKeysExamined : undefined;
    const workEfficiency =
      totalWorks > 0 ? totalAdvanced / totalWorks : undefined;

    // Analyze document efficiency
    if (
      docEfficiency !== undefined &&
      totalDocsExamined >= EFFICIENCY_THRESHOLDS.minDocsExamined
    ) {
      let severity: FindingSeverity | undefined;

      if (docEfficiency < EFFICIENCY_THRESHOLDS.docCritical) {
        severity = "critical";
      } else if (docEfficiency < EFFICIENCY_THRESHOLDS.docWarning) {
        severity = "warning";
      }

      if (severity) {
        const ratio = Math.round(totalDocsExamined / Math.max(nReturned, 1));
        findings.push({
          id: "overall-doc-efficiency",
          analyzerId: ANALYZER_ID,
          severity,
          category: "performance",
          // No metricKey - plan-level findings don't color individual metrics
          title: "Low Document Efficiency",
          description:
            `The query examined ${totalDocsExamined.toLocaleString()} documents to return ${nReturned.toLocaleString()} ` +
            `(${(docEfficiency * 100).toFixed(2)}% efficiency). MongoDB is reading ~${ratio}x more documents than needed.`,
          suggestion:
            severity === "critical"
              ? "This query is highly inefficient. Review indexes to ensure they cover the query filter. " +
                "Consider compound indexes that match the query pattern."
              : "Consider improving index coverage to reduce document examination.",
          affectedStageIds: allStages.map((s) => s.id),
          metadata: {
            docEfficiency,
            totalDocsExamined,
            nReturned,
            ratio,
          },
        });
      }
    }

    // Analyze key efficiency (only if docs efficiency is OK but keys are high)
    if (
      keyEfficiency !== undefined &&
      totalKeysExamined > totalDocsExamined * 10 && // Keys examined >> docs examined
      keyEfficiency < EFFICIENCY_THRESHOLDS.keyWarning
    ) {
      findings.push({
        id: "overall-key-efficiency",
        analyzerId: ANALYZER_ID,
        severity: "info",
        category: "indexUsage",
        // No metricKey - plan-level findings don't color individual metrics
        title: "High Key Examination",
        description:
          `The query examined ${totalKeysExamined.toLocaleString()} index keys to return ${nReturned.toLocaleString()} documents. ` +
          "While index scans are faster than document scans, this may indicate an opportunity for a more selective index.",
        suggestion:
          "Review if a more selective index could reduce the number of keys examined. " +
          "Consider compound indexes that better match the query filter.",
        affectedStageIds: allStages.map((s) => s.id),
        metadata: {
          keyEfficiency,
          totalKeysExamined,
          nReturned,
        },
      });
    }

    // Analyze work efficiency (MongoDB's internal productivity metric)
    if (
      workEfficiency !== undefined &&
      totalWorks > 100 && // Only meaningful with significant work
      workEfficiency < EFFICIENCY_THRESHOLDS.workWarning
    ) {
      findings.push({
        id: "overall-work-efficiency",
        analyzerId: ANALYZER_ID,
        severity: "warning",
        category: "performance",
        // No metricKey - plan-level findings don't color individual metrics
        title: "Low Work Productivity",
        description:
          `Only ${(workEfficiency * 100).toFixed(1)}% of work units advanced documents (${totalAdvanced.toLocaleString()} advanced / ` +
          `${totalWorks.toLocaleString()} works). Much of the execution time was spent on non-productive work.`,
        suggestion:
          "High needTime (non-productive work) often indicates inefficient filtering. " +
          "Review if index bounds are tight enough for the query conditions.",
        affectedStageIds: allStages.map((s) => s.id),
        metadata: {
          workEfficiency,
          totalWorks,
          totalAdvanced,
        },
      });
    }

    // Check for positive patterns - excellent efficiency
    if (
      docEfficiency !== undefined &&
      docEfficiency >= 0.9 &&
      totalDocsExamined >= EFFICIENCY_THRESHOLDS.minDocsExamined
    ) {
      findings.push({
        id: "overall-excellent-efficiency",
        analyzerId: ANALYZER_ID,
        severity: "info",
        category: "optimization",
        title: "Excellent Query Efficiency",
        description:
          `This query has excellent efficiency: ${nReturned.toLocaleString()} documents returned from ` +
          `${totalDocsExamined.toLocaleString()} examined (${(docEfficiency * 100).toFixed(1)}% efficiency).`,
        affectedStageIds: [rootStage.id],
        metadata: {
          docEfficiency,
          totalDocsExamined,
          nReturned,
        },
      });
    }

    return findings;
  },
} as const;
