/**
 * COLLSCAN Anti-Pattern Analyzer
 *
 * Detects when a collection scan (COLLSCAN) stage is present in the plan.
 * Collection scans read every document in a collection, which is typically
 * an anti-pattern for production queries on large collections.
 */

import type { StageDefinitionAnalyzer, AnalysisFinding } from "../types";
import { AnalyzerIds } from "../types";
import { StageCategory } from "#data/stages/types";

const ANALYZER_ID = AnalyzerIds.stageDefinition("collscan_antipattern");

export const collscanAntipattern: StageDefinitionAnalyzer = {
  layer: "stageDefinition",
  id: ANALYZER_ID,

  name: "Collection Scan Anti-Pattern",
  description:
    "Detects collection scans which may indicate missing indexes on filtered fields.",
  enabledByDefault: true,

  analyze: (input) => {
    const findings: AnalysisFinding[] = [];
    const { definition, stageId } = input;

    // Check if this is a collection scan stage
    if (definition.category === StageCategory.CollectionScan) {
      findings.push({
        id: `collscan-antipattern-${stageId}`,
        analyzerId: ANALYZER_ID,
        severity: "critical",
        category: "indexUsage",
        title: "Collection Scan Detected",
        description:
          "This query performs a full collection scan (COLLSCAN), examining every document in the collection. " +
          "For large collections, this can be slow and resource-intensive.",
        suggestion:
          "Consider adding an index on the fields used in the query filter. " +
          "Use db.collection.createIndex() to create an appropriate index.",
        affectedStageIds: [stageId],
        metadata: {
          stageName: definition.fullName,
          isBlocking:
            definition.layer === "execution" && "blockingStage" in definition
              ? definition.blockingStage
              : false,
        },
      });
    }

    return findings;
  },
} as const;
