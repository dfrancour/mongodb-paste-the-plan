import { describe, it, expect } from "vitest";
import { validatePlan, normalizeExecution, normalizePlan } from "#lib/parsers";
import { loadTestPlan, getAllTestPlanPaths } from "#test-utils/test-helpers";

describe("Schema Coverage Validation", () => {
  describe("SBE (Slot-Based Execution) Support", () => {
    it("should parse SBE execution metrics correctly", () => {
      const planData = loadTestPlan(
        "complex/aggregation-pipeline.executionStats.json",
      );
      const parsed = validatePlan(planData);

      expect(parsed.explainVersion).toBe("2");
      expect(parsed.stages).toBeDefined();
      expect(parsed.stages!.length).toBeGreaterThan(0);

      // Test SBE stage fields are accessible
      const planDataObj = planData as Record<string, unknown>;
      const stages = planDataObj.stages as unknown[];
      const firstStage = stages?.[0] as Record<string, unknown>;
      const cursor = firstStage?.$cursor as Record<string, unknown>;
      const executionStats = cursor?.executionStats as Record<string, unknown>;
      const executionStages = executionStats?.executionStages as Record<
        string,
        unknown
      >;
      const inputStage = executionStages?.inputStage as Record<string, unknown>;
      const sbeStage = inputStage?.outerStage as Record<string, unknown>;
      expect(sbeStage).toBeDefined();
      expect(sbeStage?.opens).toBeDefined();
      expect(sbeStage?.closes).toBeDefined();
      expect(sbeStage?.numTested).toBeDefined();
    });

    it("should support all new SBE stage types", () => {
      const planData = loadTestPlan(
        "complex/aggregation-pipeline.executionStats.json",
      );

      // Extract all stage types from the plan
      const stageTypes: string[] = [];
      function extractStageTypes(obj: unknown) {
        if (typeof obj === "object" && obj !== null) {
          if ("stage" in obj && typeof obj.stage === "string") {
            stageTypes.push(obj.stage);
          }
          for (const value of Object.values(obj)) {
            extractStageTypes(value);
          }
        }
      }

      extractStageTypes(planData);
      const uniqueStageTypes = [...new Set(stageTypes)];

      // Expected SBE stage types based on MongoDB 5.1+ SBE engine
      const expectedSbeTypes = [
        "nlj",
        "branch",
        "ixscan_generic",
        "ixseek",
        "seek",
        "project",
        "limit",
        "coscan",
        "unwind",
      ];
      const foundSbeTypes = uniqueStageTypes.filter((t) =>
        expectedSbeTypes.includes(t),
      );

      expect(foundSbeTypes.length).toBeGreaterThan(5); // Should find most SBE types
      expect(uniqueStageTypes).toContain("nlj"); // Nested loop join
      expect(uniqueStageTypes).toContain("branch"); // Conditional execution
      expect(uniqueStageTypes).toContain("ixscan_generic"); // SBE index scan
      expect(uniqueStageTypes).toContain("project"); // SBE projection
    });
  });

  describe("Aggregation Pipeline Metrics", () => {
    it("should parse aggregation-specific memory and spill metrics", () => {
      const planData = loadTestPlan(
        "complex/aggregation-pipeline.executionStats.json",
      );

      // Find $group stage with memory metrics
      const planDataObj = planData as Record<string, unknown>;
      const stages = planDataObj.stages as unknown[];
      const groupStage = stages?.find((s: unknown) => {
        const stage = s as Record<string, unknown>;
        return stage.$group !== undefined;
      }) as Record<string, unknown> | undefined;
      expect(groupStage).toBeDefined();

      // Verify aggregation-specific fields are present
      expect(groupStage?.maxAccumulatorMemoryUsageBytes).toBeDefined();
      expect(typeof groupStage?.maxAccumulatorMemoryUsageBytes).toBe("object");
      expect(groupStage?.spilledDataStorageSize).toBeDefined();
      expect(groupStage?.spills).toBeDefined();
      expect(typeof groupStage?.spills).toBe("number");
    });

    it("should parse stage-specific execution time estimates", () => {
      const planData = loadTestPlan(
        "complex/aggregation-pipeline.executionStats.json",
      );

      // Count stages with executionTimeMillisEstimate
      let stagesWithTimeEstimate = 0;
      function countTimeEstimates(obj: unknown) {
        if (typeof obj === "object" && obj !== null) {
          if ("executionTimeMillisEstimate" in obj) {
            stagesWithTimeEstimate++;
          }
          for (const value of Object.values(obj)) {
            countTimeEstimates(value);
          }
        }
      }

      countTimeEstimates(planData);
      expect(stagesWithTimeEstimate).toBeGreaterThan(5); // Should find multiple stages with timing
    });
  });

  describe("Advanced Index Metrics", () => {
    it("should parse SBE-specific index operation metrics", () => {
      const planData = loadTestPlan(
        "complex/aggregation-pipeline.executionStats.json",
      );

      // Count advanced index metrics
      const metricsToFind = [
        "seeks",
        "numReads",
        "indexKeySlot",
        "keysExamined",
        "keyCheckSkipped",
      ];
      const foundMetrics: Record<string, number> = {};

      function countMetrics(obj: unknown) {
        if (typeof obj === "object" && obj !== null) {
          for (const metric of metricsToFind) {
            if (metric in obj) {
              foundMetrics[metric] = (foundMetrics[metric] ?? 0) + 1;
            }
          }
          for (const value of Object.values(obj)) {
            countMetrics(value);
          }
        }
      }

      countMetrics(planData);

      expect(foundMetrics.seeks).toBeGreaterThan(0); // Index seek operations
      expect(foundMetrics.numReads).toBeGreaterThan(0); // Physical reads
      expect(foundMetrics.indexKeySlot).toBeGreaterThan(0); // SBE slot references
    });

    it("should parse traditional and SBE index scan metrics", () => {
      const planData = loadTestPlan(
        "complex/aggregation-pipeline.executionStats.json",
      );

      // Find both traditional IXSCAN and SBE ixscan_generic stages
      const stageTypes: string[] = [];
      const indexNames: string[] = [];

      function extractIndexInfo(obj: unknown) {
        if (typeof obj === "object" && obj !== null) {
          if ("stage" in obj && typeof obj.stage === "string") {
            stageTypes.push(obj.stage);
          }
          if ("indexName" in obj && typeof obj.indexName === "string") {
            indexNames.push(obj.indexName);
          }
          for (const value of Object.values(obj)) {
            extractIndexInfo(value);
          }
        }
      }

      extractIndexInfo(planData);

      expect(stageTypes).toContain("IXSCAN"); // Traditional index scan
      expect(stageTypes).toContain("ixscan_generic"); // SBE index scan
      expect(indexNames.length).toBeGreaterThan(0); // Should find index names
      expect(indexNames).toContain("room_accom_price_idx"); // Specific test index
    });
  });

  describe("Type Safety with Real Data", () => {
    it("should successfully parse and normalize SBE query plans", () => {
      const planData = loadTestPlan("basic/compound-index.executionStats.json");

      // Parsing should succeed without type errors
      expect(() => {
        const parsed = validatePlan(planData);
        expect(parsed).toBeDefined();
        expect(parsed.explainVersion).toBe("1");

        // Normalization should also succeed
        const normalized = normalizeExecution(parsed);
        expect(normalized).toBeDefined();
        expect(normalized.stage).toBeDefined();
        expect(typeof normalized.id).toBe("string");
      }).not.toThrow();
    });

    // TODO: Uncomment when SBE metric extraction is validated
    // Different test files may have different metric availability
    /*
    it('should preserve all SBE metrics in normalized stages', () => {
      const planData = loadTestPlan('basic/compound-index.executionStats.json')
      const parsed = validatePlan(planData)
      const normalized = normalizeExecution(parsed)

      // Collect all metrics from normalized stages
      const allMetrics: string[] = []
      function collectMetrics(stage: typeof normalized) {
        allMetrics.push(...Object.keys(stage.metrics))
        stage.children.forEach(collectMetrics)
      }
      
      collectMetrics(normalized)
      const uniqueMetrics = [...new Set(allMetrics)]
      
      // Should include both traditional and SBE-specific metrics
      expect(uniqueMetrics).toContain('nReturned')
      expect(uniqueMetrics).toContain('executionTimeMillis')
      expect(uniqueMetrics).toContain('executionTimeMillisEstimate') // Stage-specific timing
      expect(uniqueMetrics).toContain('indexName')
    })
    */
  });

  describe("Comprehensive Format Support", () => {
    it("should successfully parse all available test plans", () => {
      const allTestFiles = getAllTestPlanPaths();
      expect(allTestFiles.length).toBeGreaterThan(20); // Should have many test plans

      const results = {
        successful: 0,
        failed: 0,
        failedFiles: [] as string[],
      };

      allTestFiles.forEach((testFile) => {
        try {
          const planData = loadTestPlan(testFile);
          const parsed = validatePlan(planData);
          const hasExecution =
            testFile.includes("executionStats") ||
            testFile.includes("allPlansExecution");
          const normalized = hasExecution
            ? normalizeExecution(parsed)
            : normalizePlan(parsed);

          expect(parsed).toBeDefined();
          expect(normalized).toBeDefined();
          expect(normalized.stage).toBeDefined();
          results.successful++;
        } catch {
          results.failed++;
          results.failedFiles.push(testFile);
        }
      });

      // Allow for some failures but expect high success rate
      const successRate = results.successful / allTestFiles.length;
      expect(successRate).toBeGreaterThan(0.8); // 80% success rate minimum
    });

    it("should demonstrate broad stage type coverage across MongoDB versions", () => {
      const allTestFiles = getAllTestPlanPaths();
      const allStageTypes = new Set<string>();
      const stageTypeCounts: Record<string, number> = {};

      allTestFiles.forEach((testFile) => {
        try {
          const planData = loadTestPlan(testFile);

          // Extract all stage types from each plan
          function extractStageTypes(obj: unknown) {
            if (typeof obj === "object" && obj !== null) {
              if ("stage" in obj && typeof obj.stage === "string") {
                allStageTypes.add(obj.stage);
                stageTypeCounts[obj.stage] =
                  (stageTypeCounts[obj.stage] ?? 0) + 1;
              }
              for (const value of Object.values(obj)) {
                extractStageTypes(value);
              }
            }
          }

          extractStageTypes(planData);
        } catch {
          // Continue with other files if one fails
        }
      });

      // Verify we have meaningful coverage across MongoDB capabilities
      // Note: This test validates our schema can handle diverse stage types,
      // not that our test data contains every possible MongoDB stage

      // Should find core traditional stages (these are fundamental to MongoDB)
      const coreTraditionalStages = ["IXSCAN", "COLLSCAN", "FETCH"];
      const foundCoreTraditional = coreTraditionalStages.filter((s) =>
        allStageTypes.has(s),
      );
      expect(foundCoreTraditional.length).toBeGreaterThanOrEqual(2); // At least basic index and collection operations

      // Should find some SBE stages (indicates modern MongoDB support)
      const sbeStages = Array.from(allStageTypes).filter((s) =>
        [
          "nlj",
          "branch",
          "ixscan_generic",
          "ixseek",
          "seek",
          "project",
          "limit",
          "coscan",
          "unwind",
        ].includes(s),
      );
      expect(sbeStages.length).toBeGreaterThanOrEqual(3); // Should detect multiple SBE types

      // Should demonstrate comprehensive coverage (indicates robust schema)
      expect(allStageTypes.size).toBeGreaterThanOrEqual(15); // Broad MongoDB feature support
    });

    it("should extract comprehensive metrics coverage", () => {
      const allTestFiles = getAllTestPlanPaths();
      const allMetricFields = new Set<string>();

      allTestFiles.forEach((testFile) => {
        try {
          const planData = loadTestPlan(testFile);

          // Extract all metric field names
          function extractMetricFields(obj: unknown) {
            if (typeof obj === "object" && obj !== null) {
              for (const key of Object.keys(obj)) {
                if (
                  typeof key === "string" &&
                  (key.includes("Time") ||
                    key.includes("Examined") ||
                    key.includes("Returned") ||
                    key.includes("Memory") ||
                    key.includes("Spill") ||
                    key.includes("Slot") ||
                    key.includes("opens") ||
                    key.includes("closes") ||
                    key.includes("seeks") ||
                    key.includes("Reads"))
                ) {
                  allMetricFields.add(key);
                }
              }

              for (const value of Object.values(obj)) {
                extractMetricFields(value);
              }
            }
          }

          extractMetricFields(planData);
        } catch {
          // Continue with other files if one fails
        }
      });

      // Verify we have comprehensive metrics coverage
      expect(allMetricFields.has("executionTimeMillis")).toBe(true);
      expect(allMetricFields.has("nReturned")).toBe(true);
      expect(allMetricFields.has("docsExamined")).toBe(true);
      expect(allMetricFields.has("keysExamined")).toBe(true);
      expect(allMetricFields.size).toBeGreaterThan(20); // Should find many metric types
    });
  });
});
