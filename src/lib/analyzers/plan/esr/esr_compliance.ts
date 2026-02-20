/**
 * ESR Compliance Analyzer
 *
 * Plan-level analyzer that checks if query conditions follow the
 * ESR (Equality, Sort, Range) pattern for optimal index usage.
 *
 * Generates findings when:
 * - Query doesn't follow ESR pattern (warning)
 * - Index fields are unused (info)
 * - Large $in arrays behave as range (info)
 */

import type { PlanAnalyzer, AnalysisFinding, PlanInput } from "../../types";
import { AnalyzerIds } from "../../types";
import { analyzeExplainPlan } from "./esr_utils";

export const esrCompliance: PlanAnalyzer = {
  id: AnalyzerIds.plan("esr_compliance"),
  name: "ESR Compliance",
  description:
    "Checks if query conditions follow the ESR (Equality, Sort, Range) pattern for optimal compound index usage",
  layer: "plan",
  enabledByDefault: true,

  analyze(input: PlanInput): AnalysisFinding[] {
    const findings: AnalysisFinding[] = [];
    const { explainPlan } = input;

    // Run ESR analysis on the plan
    const esrAnalyses = analyzeExplainPlan(explainPlan);

    for (const analysis of esrAnalyses) {
      const { indexName, esrPattern, insights } = analysis;

      // Finding: ESR pattern violation
      if (!esrPattern.followsESRPattern) {
        findings.push({
          id: `esr-violation-${indexName}`,
          analyzerId: esrCompliance.id,
          severity: "warning",
          category: "indexUsage",
          title: `Index ${indexName} query doesn't follow ESR pattern`,
          description: esrPattern.explanation,
          suggestion:
            "Consider reordering compound index fields to match query pattern: equality fields first, then sort fields, then range fields.",
          metadata: {
            indexName,
            equalityFields: esrPattern.equalityFields,
            sortFields: esrPattern.sortFields,
            rangeFields: esrPattern.rangeFields,
          },
        });
      }

      // Finding: Unused index fields
      if (esrPattern.unusedIndexFields.length > 0) {
        findings.push({
          id: `unused-index-fields-${indexName}`,
          analyzerId: esrCompliance.id,
          severity: "info",
          category: "indexUsage",
          title: `Index ${indexName} has unused trailing fields`,
          description: `${esrPattern.unusedIndexFields.length} index fields are not used by this query: ${esrPattern.unusedIndexFields.join(", ")}`,
          suggestion:
            "Unused trailing fields don't affect query performance but may indicate the index is larger than needed for this specific query pattern.",
          metadata: {
            indexName,
            unusedFields: esrPattern.unusedIndexFields,
          },
        });
      }

      // Finding: Large $in arrays
      const largeInInsight = insights.find((i) => i.includes("200+ elements"));
      if (largeInInsight) {
        findings.push({
          id: `large-in-array-${indexName}`,
          analyzerId: esrCompliance.id,
          severity: "info",
          category: "queryPattern",
          title: "Large $in array behaves as range operation",
          description: largeInInsight,
          suggestion:
            "Consider breaking large $in queries into smaller batches or using a different query strategy.",
          metadata: { indexName },
        });
      }
    }

    return findings;
  },
};
