/**
 * Covered Query Optimal Analyzer
 *
 * Detects when a query is "covered" - meaning it can be satisfied entirely
 * from the index without fetching documents from the collection.
 * This is the optimal scenario for read performance.
 */

import type { StageDefinitionAnalyzer, AnalysisFinding } from "../types";
import { AnalyzerIds } from "../types";

/** Exported for use in getPerformanceLevelFromFindings */
export const COVERED_QUERY_ANALYZER_ID = AnalyzerIds.stageDefinition(
  "covered_query_optimal",
);

const ANALYZER_ID = COVERED_QUERY_ANALYZER_ID;

export const coveredQueryOptimal: StageDefinitionAnalyzer = {
  layer: "stageDefinition",
  id: ANALYZER_ID,

  name: "Covered Query Detection",
  description:
    "Identifies covered queries where all data is served from the index without document fetch.",
  enabledByDefault: true,

  analyze: (input) => {
    const findings: AnalysisFinding[] = [];
    const { definition, stageId } = input;

    // Check if this stage indicates a covered query
    if (definition.isCoveredQueryIndicator) {
      findings.push({
        id: `covered-query-${stageId}`,
        analyzerId: ANALYZER_ID,
        severity: "info",
        category: "optimization",
        title: "Covered Query",
        description:
          "This query is fully covered by the index. All requested fields are available in the " +
          "index, so MongoDB doesn't need to fetch documents from the collection.",
        affectedStageIds: [stageId],
        metadata: {
          stageName: definition.fullName,
        },
      });
    }

    return findings;
  },
} as const;
