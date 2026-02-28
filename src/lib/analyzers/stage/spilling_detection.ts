/**
 * Spilling Detection Analyzer
 *
 * Detects stages that have spilled data to disk during execution.
 * Works across all spill-capable stages by checking:
 * 1. usedDisk === true (critical)
 * 2. Spill counts > 0 (warning with byte counts)
 * 3. Memory pressure: totalDataSizeSorted / memLimit > 0.8 (info)
 *
 * Covers: SORT, GROUP, SPOOL, TEXT_OR, GEO_NEAR_*, hash_lookup, window
 * Note: Memory pressure check (3) only applies to SORT (totalDataSizeSorted/memLimit).
 */

import type { StageMetricsAnalyzer, AnalysisFinding } from "../types";
import { AnalyzerIds } from "../types";
import { hasExecutionMetrics } from "#types/explain-plan";
import { isExecutionStage } from "#data/stages/types";

const ANALYZER_ID = AnalyzerIds.stage("spilling_detection");

/** Memory pressure threshold (80% of memLimit) */
const MEMORY_PRESSURE_THRESHOLD = 0.8;

export const spillingDetection: StageMetricsAnalyzer = {
  layer: "stage",
  id: ANALYZER_ID,

  name: "Disk Spilling Detection",
  description:
    "Detects stages that spilled data to disk, indicating memory pressure.",
  enabledByDefault: true,

  analyze: (input) => {
    const findings: AnalysisFinding[] = [];
    const { stage } = input;

    if (!hasExecutionMetrics(stage)) return findings;

    const def = stage.definition;
    if (!def || !isExecutionStage(def) || !def.canSpillToDisk) {
      return findings;
    }

    const { metrics } = stage;

    // Check 1: usedDisk === true (critical — actual disk spilling occurred)
    if (metrics.usedDisk === true) {
      const spillCount =
        typeof metrics.spills === "number" ? metrics.spills : undefined;
      const spilledBytes =
        typeof metrics.spilledBytes === "number"
          ? metrics.spilledBytes
          : undefined;

      const details = [
        spillCount !== undefined ? `${spillCount} spill(s)` : null,
        spilledBytes !== undefined
          ? `${(spilledBytes / 1024 / 1024).toFixed(1)}MB spilled`
          : null,
      ]
        .filter(Boolean)
        .join(", ");

      findings.push({
        id: `spilling-disk-${stage.id}`,
        analyzerId: ANALYZER_ID,
        severity: "critical",
        category: "performance",
        title: "Stage Spilled to Disk",
        description:
          `This ${stage.stage} stage spilled data to disk during execution` +
          (details ? ` (${details})` : "") +
          ". Disk spilling significantly degrades performance.",
        suggestion:
          "Increase the memory limit or reduce the data volume processed by this stage. " +
          "For SORT stages, consider adding an index that provides the sort order.",
        affectedStageIds: [stage.id],
        metadata: {
          stageName: stage.stage,
          usedDisk: true,
          spills: spillCount,
          spilledBytes,
          memLimit: metrics.memLimit,
        },
      });

      return findings;
    }

    // Check 2: Spill counts > 0 (without usedDisk flag)
    if (typeof metrics.spills === "number" && metrics.spills > 0) {
      findings.push({
        id: `spilling-count-${stage.id}`,
        analyzerId: ANALYZER_ID,
        severity: "warning",
        category: "performance",
        title: "Disk Spilling Detected",
        description: `This ${stage.stage} stage had ${metrics.spills} spill(s) to disk.`,
        suggestion:
          "Consider increasing the memory limit to avoid disk spilling.",
        affectedStageIds: [stage.id],
        metadata: {
          stageName: stage.stage,
          spills: metrics.spills,
        },
      });

      return findings;
    }

    // Check 3: Memory pressure (totalDataSizeSorted / memLimit > 80%)
    if (
      metrics.totalDataSizeSorted !== undefined &&
      metrics.memLimit !== undefined &&
      metrics.memLimit > 0
    ) {
      const pressure = metrics.totalDataSizeSorted / metrics.memLimit;
      if (pressure > MEMORY_PRESSURE_THRESHOLD) {
        findings.push({
          id: `spilling-pressure-${stage.id}`,
          analyzerId: ANALYZER_ID,
          severity: "info",
          category: "performance",
          title: "High Memory Pressure",
          description:
            `This ${stage.stage} stage used ${(pressure * 100).toFixed(0)}% of its ` +
            `${(metrics.memLimit / 1024 / 1024).toFixed(0)}MB memory limit. ` +
            "It may spill to disk under heavier load.",
          suggestion:
            "Monitor this stage under production load. Consider adding an index " +
            "or increasing the memory limit to prevent future disk spilling.",
          affectedStageIds: [stage.id],
          metadata: {
            stageName: stage.stage,
            totalDataSizeSorted: metrics.totalDataSizeSorted,
            memLimit: metrics.memLimit,
            pressurePercentage: Math.round(pressure * 100),
          },
        });
      }
    }

    return findings;
  },
} as const;
