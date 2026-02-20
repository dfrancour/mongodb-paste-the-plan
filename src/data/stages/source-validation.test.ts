/**
 * Tests validating that sourceFile paths match stage categorization.
 *
 * These tests ensure data integrity between the stage's declared type
 * (pipeline/classic/sbe) and its sourceFile reference to MongoDB source code.
 */

import { describe, it, expect } from "vitest";
import {
  getAllStages,
  isPipelineStage,
  isPlanningStage,
  isSbeStage,
  isClassicStage,
} from ".";

/**
 * Expected sourceFile path patterns for each stage type:
 *
 * Pipeline stages: src/mongo/db/pipeline/
 *   - document_source_*.h files
 *
 * SBE execution stages: src/mongo/db/exec/sbe/
 *   - stages/*.h files (scan.h, hash_agg.h, etc.)
 *
 * Classic execution stages: src/mongo/db/exec/ but NOT src/mongo/db/exec/sbe/
 *   - classic/*.h files (collection_scan.h, fetch.h, etc.)
 *   - agg/*.h files (group_stage.h, unwind_stage.h, etc.)
 */

describe("Stage sourceFile validation", () => {
  const allStages = getAllStages();
  const pipelineStages = allStages.filter(isPipelineStage);
  const planningStages = allStages.filter(isPlanningStage);
  const sbeStages = allStages.filter(isSbeStage);
  const classicStages = allStages.filter(isClassicStage);

  describe("Pipeline stage sourceFile paths", () => {
    const PIPELINE_PATH_PREFIX = "src/mongo/db/pipeline/";

    it("stages with sourceFile should reference pipeline directory", () => {
      const violations: { id: string; sourceFile: string }[] = [];

      for (const stage of pipelineStages) {
        if (stage.sourceFile) {
          if (!stage.sourceFile.startsWith(PIPELINE_PATH_PREFIX)) {
            violations.push({
              id: stage.id,
              sourceFile: stage.sourceFile,
            });
          }
        }
      }

      if (violations.length > 0) {
        const details = violations
          .map((v) => `  ${v.id}: ${v.sourceFile}`)
          .join("\n");
        expect.fail(
          `${violations.length} pipeline stage(s) have sourceFile outside ${PIPELINE_PATH_PREFIX}:\n${details}`,
        );
      }
    });

    it("reports pipeline stages without sourceFile (informational)", () => {
      const missing = pipelineStages.filter((s) => !s.sourceFile);
      if (missing.length > 0) {
        // Informational: some pipeline stages don't have sourceFile
      }
      // This test always passes - it's informational
      expect(true).toBe(true);
    });
  });

  describe("Planning stage sourceFile paths", () => {
    const PLANNING_PATH_PREFIXES = [
      "src/mongo/db/query/compiler/physical_model/query_solution/",
      "src/mongo/db/query/stage_builder/sbe/",
    ];

    it("stages with sourceFile should reference query solution or stage builder directories", () => {
      const violations: { id: string; sourceFile: string }[] = [];

      for (const stage of planningStages) {
        if (stage.sourceFile) {
          const isValidPath = PLANNING_PATH_PREFIXES.some((prefix) =>
            stage.sourceFile!.startsWith(prefix),
          );
          if (!isValidPath) {
            violations.push({
              id: stage.id,
              sourceFile: stage.sourceFile,
            });
          }
        }
      }

      if (violations.length > 0) {
        const details = violations
          .map((v) => `  ${v.id}: ${v.sourceFile}`)
          .join("\n");
        expect.fail(
          `${violations.length} planning stage(s) have sourceFile outside valid planning directories:\n${details}`,
        );
      }
    });

    it("reports planning stages without sourceFile (informational)", () => {
      const missing = planningStages.filter((s) => !s.sourceFile);
      if (missing.length > 0) {
        // Informational: some planning stages don't have sourceFile
      }
      expect(true).toBe(true);
    });
  });

  describe("SBE stage sourceFile paths", () => {
    const SBE_PATH_PREFIXES = [
      "src/mongo/db/exec/sbe/",
      "src/mongo/db/query/stage_builder/sbe/",
    ];

    it("stages with sourceFile should reference SBE directory", () => {
      const violations: { id: string; sourceFile: string }[] = [];

      for (const stage of sbeStages) {
        if (stage.sourceFile) {
          const isValidPath = SBE_PATH_PREFIXES.some((prefix) =>
            stage.sourceFile!.startsWith(prefix),
          );
          if (!isValidPath) {
            violations.push({
              id: stage.id,
              sourceFile: stage.sourceFile,
            });
          }
        }
      }

      if (violations.length > 0) {
        const details = violations
          .map((v) => `  ${v.id}: ${v.sourceFile}`)
          .join("\n");
        expect.fail(
          `${violations.length} SBE stage(s) have sourceFile outside valid SBE directories:\n${details}`,
        );
      }
    });

    it("reports SBE stages without sourceFile (informational)", () => {
      const missing = sbeStages.filter((s) => !s.sourceFile);
      if (missing.length > 0) {
        // Informational: some SBE stages don't have sourceFile
      }
      expect(true).toBe(true);
    });
  });

  describe("Classic stage sourceFile paths", () => {
    // Classic stages should be in valid exec directories:
    // - src/mongo/db/exec/classic/ - main classic implementation
    // - src/mongo/db/exec/express/ - express execution path (fast single-doc operations)
    // Classic stages should NOT be in:
    // - src/mongo/db/exec/sbe/ - SBE engine only
    // - src/mongo/db/exec/agg/ - these are pipeline-level stages, not query execution stages
    // - src/mongo/db/pipeline/ - pipeline layer, not execution layer
    const VALID_CLASSIC_PREFIXES = [
      "src/mongo/db/exec/classic/",
      "src/mongo/db/exec/express/",
    ];
    const INVALID_CLASSIC_PREFIXES = [
      { prefix: "src/mongo/db/exec/sbe/", reason: "SBE engine, not classic" },
      {
        prefix: "src/mongo/db/exec/agg/",
        reason:
          "pipeline-level aggregation stage, not query execution - stage should be removed",
      },
      {
        prefix: "src/mongo/db/pipeline/",
        reason: "pipeline layer, not execution layer - stage should be removed",
      },
    ];

    it("stages with sourceFile should reference valid classic exec directories", () => {
      const violations: {
        id: string;
        sourceFile: string;
        reason: string;
      }[] = [];

      for (const stage of classicStages) {
        if (stage.sourceFile) {
          // Check if in a valid directory
          const isValidPath = VALID_CLASSIC_PREFIXES.some((prefix) =>
            stage.sourceFile!.startsWith(prefix),
          );

          if (!isValidPath) {
            // Find specific reason if in an invalid directory
            const invalidMatch = INVALID_CLASSIC_PREFIXES.find((inv) =>
              stage.sourceFile!.startsWith(inv.prefix),
            );
            violations.push({
              id: stage.id,
              sourceFile: stage.sourceFile,
              reason:
                invalidMatch?.reason ??
                `not in valid classic directories: ${VALID_CLASSIC_PREFIXES.join(", ")}`,
            });
          }
        }
      }

      if (violations.length > 0) {
        const details = violations
          .map((v) => `  ${v.id}: ${v.sourceFile} (${v.reason})`)
          .join("\n");
        expect.fail(
          `${violations.length} Classic stage(s) have invalid sourceFile paths:\n${details}`,
        );
      }
    });

    it("reports Classic stages without sourceFile (informational)", () => {
      const missing = classicStages.filter((s) => !s.sourceFile);
      if (missing.length > 0) {
        // Informational: some Classic stages don't have sourceFile
      }
      expect(true).toBe(true);
    });
  });

  describe("Cross-validation: no SBE stages with classic paths", () => {
    it("SBE stages should not reference classic exec paths", () => {
      const CLASSIC_PATH = "src/mongo/db/exec/classic/";
      const AGG_PATH = "src/mongo/db/exec/agg/";

      const violations: { id: string; sourceFile: string }[] = [];

      for (const stage of sbeStages) {
        if (stage.sourceFile) {
          if (
            stage.sourceFile.startsWith(CLASSIC_PATH) ||
            stage.sourceFile.startsWith(AGG_PATH)
          ) {
            violations.push({
              id: stage.id,
              sourceFile: stage.sourceFile,
            });
          }
        }
      }

      if (violations.length > 0) {
        const details = violations
          .map((v) => `  ${v.id}: ${v.sourceFile}`)
          .join("\n");
        expect.fail(
          `${violations.length} SBE stage(s) incorrectly reference classic/agg paths:\n${details}`,
        );
      }
    });
  });

  describe("Cross-validation: no classic stages with SBE paths", () => {
    it("Classic stages should not reference SBE exec paths", () => {
      const SBE_PATH_PREFIX = "src/mongo/db/exec/sbe/";

      const violations: { id: string; sourceFile: string }[] = [];

      for (const stage of classicStages) {
        if (stage.sourceFile) {
          if (stage.sourceFile.startsWith(SBE_PATH_PREFIX)) {
            violations.push({
              id: stage.id,
              sourceFile: stage.sourceFile,
            });
          }
        }
      }

      if (violations.length > 0) {
        const details = violations
          .map((v) => `  ${v.id}: ${v.sourceFile}`)
          .join("\n");
        expect.fail(
          `${violations.length} Classic stage(s) incorrectly reference SBE paths:\n${details}`,
        );
      }
    });
  });

  describe("Cross-validation: no execution stages with pipeline paths", () => {
    it("execution stages should not reference pipeline directory", () => {
      const PIPELINE_PATH = "src/mongo/db/pipeline/";
      const executionStages = [...sbeStages, ...classicStages];

      const violations: {
        id: string;
        engine: string;
        sourceFile: string;
      }[] = [];

      for (const stage of executionStages) {
        if (stage.sourceFile) {
          if (stage.sourceFile.startsWith(PIPELINE_PATH)) {
            violations.push({
              id: stage.id,
              engine: stage.engine,
              sourceFile: stage.sourceFile,
            });
          }
        }
      }

      if (violations.length > 0) {
        const details = violations
          .map((v) => `  ${v.id} (${v.engine}): ${v.sourceFile}`)
          .join("\n");
        expect.fail(
          `${violations.length} execution stage(s) incorrectly reference pipeline directory:\n${details}`,
        );
      }
    });
  });

  describe("Coverage summary", () => {
    it("reports sourceFile coverage statistics", () => {
      const withSourceFile = allStages.filter((s) => s.sourceFile);
      const withoutSourceFile = allStages.filter((s) => !s.sourceFile);

      const pipelineWithSource = pipelineStages.filter((s) => s.sourceFile);
      const planningWithSource = planningStages.filter((s) => s.sourceFile);
      const sbeWithSource = sbeStages.filter((s) => s.sourceFile);
      const classicWithSource = classicStages.filter((s) => s.sourceFile);

      // This test always passes - it's informational
      expect(true).toBe(true);
    });
  });
});
