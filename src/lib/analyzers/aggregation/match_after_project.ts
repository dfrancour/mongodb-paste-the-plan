/**
 * Match After Project Analyzer
 *
 * Detects when a $match stage appears after a $project stage in the
 * aggregation pipeline. This is typically suboptimal because:
 *
 * 1. $project may rename or transform fields that $match needs
 * 2. MongoDB cannot push the $match filter before the $project
 * 3. The $match cannot benefit from indexes on the original field names
 *
 * Best practice: Place $match stages as early as possible in the pipeline,
 * ideally immediately after the collection source.
 */

import type { AggregationAnalyzer, AnalysisFinding } from "../types";
import { AnalyzerIds } from "../types";

const ANALYZER_ID = AnalyzerIds.aggregation("match_after_project");

/** Pipeline stages that modify document shape (block match push-down) */
const SHAPE_MODIFYING_STAGES = [
  "$project",
  "$addFields",
  "$set",
  "$unset",
  "$replaceRoot",
  "$replaceWith",
] as const;

/** Stages that typically benefit from being early in pipeline */
const FILTERABLE_STAGES = ["$match", "$redact"] as const;

export const matchAfterProject: AggregationAnalyzer = {
  layer: "aggregation",
  id: ANALYZER_ID,

  name: "$match After $project Detection",
  description:
    "Identifies $match stages that appear after document-shaping stages, limiting optimization.",
  enabledByDefault: true,

  analyze: (input) => {
    const findings: AnalysisFinding[] = [];
    const { pipeline } = input;

    if (pipeline.length < 2) {
      return findings;
    }

    // Track when we've seen shape-modifying stages
    let lastShapeModifyingStageIndex = -1;
    let lastShapeModifyingStageName = "";

    for (let i = 0; i < pipeline.length; i++) {
      const current = pipeline[i]!;
      const stageName = current.stage;

      // Track shape-modifying stages
      if (isShapeModifyingStage(stageName)) {
        lastShapeModifyingStageIndex = i;
        lastShapeModifyingStageName = stageName;
      }

      // Check if this is a filterable stage after a shape-modifying stage
      if (
        isFilterableStage(stageName) &&
        lastShapeModifyingStageIndex >= 0 &&
        lastShapeModifyingStageIndex < i
      ) {
        findings.push({
          id: `match-after-project-${i}`,
          analyzerId: ANALYZER_ID,
          severity: "warning",
          category: "optimization",
          title: `${stageName} After ${lastShapeModifyingStageName}`,
          description:
            `${stageName} at position ${i + 1} comes after ${lastShapeModifyingStageName} at position ${lastShapeModifyingStageIndex + 1}. ` +
            `MongoDB cannot push ${stageName} before ${lastShapeModifyingStageName}, so it cannot use indexes on original fields.`,
          suggestion:
            `Consider moving the ${stageName} before ${lastShapeModifyingStageName} if the filter conditions ` +
            `use fields that haven't been modified. This allows MongoDB to push filters to the collection scan ` +
            `and potentially use indexes.`,
          metadata: {
            filterStage: stageName,
            filterPosition: i,
            blockingStage: lastShapeModifyingStageName,
            blockingPosition: lastShapeModifyingStageIndex,
          },
        });
      }
    }

    // Check for $match not at the beginning (general optimization advice)
    const firstMatch = pipeline.findIndex((s) => s.stage === "$match");
    if (firstMatch > 0) {
      const stagesBeforeMatch = pipeline.slice(0, firstMatch);
      const nonOptimizableStagesBefore = stagesBeforeMatch.filter(
        (s) => !canMoveBefore(s.stage),
      );

      if (nonOptimizableStagesBefore.length > 0) {
        const stageNames = nonOptimizableStagesBefore
          .map((s) => s.stage)
          .join(", ");
        findings.push({
          id: "match-not-at-start",
          analyzerId: ANALYZER_ID,
          severity: "info",
          category: "optimization",
          title: "First $match Not at Pipeline Start",
          description:
            `The first $match is at position ${firstMatch + 1}, after: ${stageNames}. ` +
            "This may prevent MongoDB from using indexes for initial filtering.",
          suggestion:
            "If possible, restructure the pipeline to place $match filters early. " +
            "Filters on original collection fields should ideally be first.",
          metadata: {
            firstMatchPosition: firstMatch,
            stagesBefore: stageNames,
          },
        });
      }
    }

    return findings;
  },
} as const;

/**
 * Check if a stage modifies document shape (blocks filter push-down).
 */
function isShapeModifyingStage(stageName: string): boolean {
  return SHAPE_MODIFYING_STAGES.includes(
    stageName as (typeof SHAPE_MODIFYING_STAGES)[number],
  );
}

/**
 * Check if a stage is a filterable stage that benefits from early placement.
 */
function isFilterableStage(stageName: string): boolean {
  return FILTERABLE_STAGES.includes(
    stageName as (typeof FILTERABLE_STAGES)[number],
  );
}

/**
 * Check if MongoDB can potentially move a $match before this stage.
 * Some stages like $sort, $skip, $limit may not block filter optimization.
 */
function canMoveBefore(stageName: string): boolean {
  // Stages that don't fundamentally block $match push-down
  const movableStages = [
    "$sort",
    "$skip",
    "$limit",
    "$collStats",
    "$indexStats",
    "$planCacheStats",
    "$currentOp",
  ];

  return movableStages.includes(stageName);
}
