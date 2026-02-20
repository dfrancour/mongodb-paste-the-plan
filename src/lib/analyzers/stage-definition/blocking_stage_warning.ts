/**
 * Blocking Stage Warning Analyzer
 *
 * Detects stages that are "blocking" - meaning they must consume all input
 * before producing any output. This affects query latency because results
 * cannot stream incrementally.
 *
 * Common blocking stages:
 * - SORT (must see all documents to sort them)
 * - $group (must see all documents to aggregate)
 * - $bucket, $bucketAuto (must process all to bucket)
 *
 * Blocking stages can also cause memory pressure if the dataset is large.
 */

import type { StageDefinitionAnalyzer, AnalysisFinding } from "../types";
import { AnalyzerIds } from "../types";
import {
  isExecutionStage,
  isMongosStage,
  isPlanningStage,
} from "#data/stages/types";

const ANALYZER_ID = AnalyzerIds.stageDefinition("blocking_stage_warning");

export const blockingStageWarning: StageDefinitionAnalyzer = {
  layer: "stageDefinition",
  id: ANALYZER_ID,

  name: "Blocking Stage Detection",
  description:
    "Identifies blocking stages that must consume all input before producing output.",
  enabledByDefault: true,

  analyze: (input) => {
    const findings: AnalysisFinding[] = [];
    const { definition, stageId } = input;

    // Check if this stage has blocking characteristics
    // blockingStage is on ExecutionStage and MongosStage, optional on PipelineStage
    let isBlocking = false;

    if (
      isExecutionStage(definition) ||
      isMongosStage(definition) ||
      isPlanningStage(definition)
    ) {
      isBlocking = definition.blockingStage;
    } else if (
      definition.layer === "pipeline" &&
      definition.executionCharacteristics
    ) {
      isBlocking = definition.executionCharacteristics.blockingStage;
    }

    if (isBlocking) {
      findings.push({
        id: `blocking-stage-${stageId}`,
        analyzerId: ANALYZER_ID,
        severity: "info",
        category: "performance",
        title: "Blocking Stage",
        description:
          `${definition.fullName} is a blocking operation that must process all input documents ` +
          "before producing output. This prevents streaming of results and may impact latency.",
        suggestion:
          "For large datasets, consider if the operation can be avoided or performed differently. " +
          "For sorts, an index providing the sort order can make this non-blocking.",
        affectedStageIds: [stageId],
        metadata: {
          stageName: definition.fullName,
          category: definition.category,
          canSpillToDisk:
            isExecutionStage(definition) ||
            isMongosStage(definition) ||
            isPlanningStage(definition)
              ? definition.canSpillToDisk
              : definition.executionCharacteristics?.canSpillToDisk,
        },
      });
    }

    return findings;
  },
} as const;
