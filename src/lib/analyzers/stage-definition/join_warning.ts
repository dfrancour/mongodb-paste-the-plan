/**
 * Join Warning Analyzer
 *
 * Detects join operations ($lookup, nested loop joins, etc.) which can be
 * expensive operations that may benefit from optimization.
 *
 * Join operations typically:
 * - Perform nested iterations over two collections
 * - Can be expensive for large collections
 * - May benefit from indexes on the foreign collection
 * - Could potentially be replaced with denormalization
 */

import type { StageDefinitionAnalyzer, AnalysisFinding } from "../types";
import { AnalyzerIds } from "../types";
import { StageCategory } from "#data/stages/types";

const ANALYZER_ID = AnalyzerIds.stageDefinition("join_warning");

export const joinWarning: StageDefinitionAnalyzer = {
  layer: "stageDefinition",
  id: ANALYZER_ID,

  name: "Join Operation Warning",
  description:
    "Identifies join operations ($lookup, etc.) that may be expensive and benefit from optimization.",
  enabledByDefault: true,

  analyze: (input) => {
    const findings: AnalysisFinding[] = [];
    const { definition, stageId } = input;

    // Check if this is a join stage
    if (definition.category === StageCategory.Join) {
      findings.push({
        id: `join-warning-${stageId}`,
        analyzerId: ANALYZER_ID,
        severity: "warning",
        category: "performance",
        title: "Join Operation Detected",
        description:
          `This query uses a join operation (${definition.fullName}). ` +
          "Join operations can be expensive, especially for large collections, as they may " +
          "perform nested iterations.",
        suggestion:
          "Ensure the foreign collection has appropriate indexes. " +
          "For frequently accessed data, consider denormalization to avoid joins.",
        affectedStageIds: [stageId],
        metadata: {
          stageName: definition.fullName,
          stageId: definition.id,
          analysisNote: definition.analysisNote,
        },
      });
    }

    return findings;
  },
} as const;
