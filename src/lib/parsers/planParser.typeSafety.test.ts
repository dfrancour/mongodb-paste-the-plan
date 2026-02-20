import { describe, it, expect } from "vitest";
import { PlanParser } from "./planParser";
import { hasNumericProperty, hasStringProperty } from "#lib/utils/jsxUtils";
import { extractStageMetrics, loadTestPlan } from "#test-utils/test-helpers";

describe("TypeScript Type Safety Patterns", () => {
  it("should safely extract metrics without any types or runtime errors", () => {
    const malformedPlans = [
      { stage: "IXSCAN", invalidField: "unexpected" },
      { stage: "COLLSCAN", nReturned: "not-a-number" },
      { stage: "FETCH" }, // missing expected fields
      { stage: "SORT", nReturned: null },
      { stage: "OR", docsExamined: undefined },
      null,
      undefined,
      "not-an-object",
      42,
      [],
    ];

    malformedPlans.forEach((plan) => {
      // Behavioral expectation: No runtime errors, graceful handling
      expect(() => {
        const metrics = extractStageMetrics(plan);
        // Should return valid structure even with bad input
        expect(typeof metrics).toBe("object");
        expect(metrics).not.toBeNull();
      }).not.toThrow();
    });
  });

  it("should use proper type guards for property access", () => {
    const testCases = [
      {
        obj: { nReturned: 100 },
        prop: "nReturned",
        expectedType: "number",
        shouldMatch: true,
      },
      {
        obj: { nReturned: "100" },
        prop: "nReturned",
        expectedType: "number",
        shouldMatch: false,
      },
      {
        obj: { indexName: "user_id_1" },
        prop: "indexName",
        expectedType: "string",
        shouldMatch: true,
      },
      {
        obj: { indexName: 123 },
        prop: "indexName",
        expectedType: "string",
        shouldMatch: false,
      },
      { obj: {}, prop: "missing", expectedType: "number", shouldMatch: false },
      {
        obj: { nullValue: null },
        prop: "nullValue",
        expectedType: "number",
        shouldMatch: false,
      },
    ];

    testCases.forEach(({ obj, prop, expectedType, shouldMatch }) => {
      if (expectedType === "number") {
        const result = hasNumericProperty(obj, prop);
        expect(result).toBe(shouldMatch);
      } else if (expectedType === "string") {
        const result = hasStringProperty(obj, prop);
        expect(result).toBe(shouldMatch);
      }
    });
  });

  it("should handle unknown explain plan formats without throwing", () => {
    const unknownFormats = [
      { unknownField: "value" },
      { stage: "NEW_UNKNOWN_STAGE" },
      { executionStats: null },
      { queryPlanner: { winningPlan: null } },
      { executionStats: { executionStages: "invalid" } },
    ];

    unknownFormats.forEach((format) => {
      // Behavioral expectation: Should attempt parsing without crashing
      expect(() => {
        try {
          const parsed = PlanParser.parse(format);
          // If parsing succeeds, normalization should also not throw
          if (parsed) {
            PlanParser.normalizePlan(parsed);
          }
        } catch (error) {
          // PlanParseError is expected for invalid formats, but should be controlled
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).name).toMatch(
            /PlanParseError|ZodError|TypeError/,
          );
        }
      }).not.toThrow();
    });
  });

  it("should preserve type safety in complex nested structures", () => {
    // Test with realistic but edge-case data
    const edgeCaseStage = {
      stage: "FETCH",
      nReturned: 100,
      docsExamined: 150,
      inputStage: {
        stage: "IXSCAN",
        keysExamined: 100,
        indexName: "compound_index_1",
        // Missing some optional fields
      },
      // Extra unknown fields
      futureField: "should-be-ignored",
      experimentalData: { nested: "data" },
    };

    // Behavioral expectation: Should extract known fields safely
    expect(() => {
      const metrics = extractStageMetrics(edgeCaseStage);

      // Should have the fields we expect
      expect(metrics.stage).toBe("FETCH");
      expect(metrics.nReturned).toBe(100);
      expect(metrics.docsExamined).toBe(150);

      // Should not include unknown fields in extracted metrics
      expect(metrics).not.toHaveProperty("futureField");
      expect(metrics).not.toHaveProperty("experimentalData");
    }).not.toThrow();
  });

  it("should handle circular references without infinite loops", () => {
    // Create circular reference (edge case in malformed plans)
    const circularStage: any = {
      stage: "FETCH",
      nReturned: 50,
    };
    circularStage.inputStage = circularStage; // Create circular reference

    // Behavioral expectation: Should not hang or crash
    expect(() => {
      const metrics = extractStageMetrics(circularStage);
      expect(metrics.stage).toBe("FETCH");
      expect(metrics.nReturned).toBe(50);
    }).not.toThrow();
  });

  it("should validate Zod schemas against real MongoDB plan variations", () => {
    const realPlanVariations = [
      "basic/simple-index-scan.executionStats.json",
      "complex/text-search.executionStats.json",
      "complex/or-operation.executionStats.json",
      "complex/deep-nesting.executionStats.json",
    ];

    realPlanVariations.forEach((planPath) => {
      // Load the actual file content using helper
      const planData = loadTestPlan(planPath);

      // Behavioral expectation: Real plans should parse successfully
      expect(() => {
        const parsed = PlanParser.parse(planData);
        expect(parsed).toBeDefined();

        // Normalization should also succeed
        const normalized = PlanParser.normalizeExecution(parsed);
        expect(normalized.stage).toBeDefined();
        expect(typeof normalized.id).toBe("string");
      }).not.toThrow();
    });
  });
});
