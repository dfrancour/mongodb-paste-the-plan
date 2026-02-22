/**
 * Test plan parser with real test plans to ensure schema compatibility
 */
import { describe, it, expect } from "vitest";
import { validatePlan } from "#lib/parsers";
import {
  loadTestPlan,
  getStandardQueryPlanPaths,
} from "#test-utils/test-helpers";

describe("Plan Parser Schema Compatibility", () => {
  it("should parse basic simple-index-scan executionStats", () => {
    const planData = loadTestPlan(
      "basic/simple-index-scan.executionStats.json",
    );

    // This should not throw
    expect(() => {
      validatePlan(planData);
    }).not.toThrow();
  });

  it("should parse all test plans without schema errors", () => {
    const testPlanPaths = getStandardQueryPlanPaths();
    const failures: Array<{ path: string; error: string }> = [];

    for (const planPath of testPlanPaths) {
      try {
        const planData = loadTestPlan(planPath);
        validatePlan(planData);
      } catch (error) {
        failures.push({
          path: planPath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (failures.length > 0) {
      console.error("Schema validation failures:");
      failures.forEach(({ path, error }) => {
        console.error(`  ${path}: ${error}`);
      });

      expect.fail(
        `${failures.length} test plans failed schema validation. See console for details.`,
      );
    }
  });

  it("should handle invalid plan gracefully", () => {
    const invalidPlan = { invalid: "data" };

    expect(() => validatePlan(invalidPlan)).toThrow(
      "Not a recognized MongoDB explain plan",
    );
  });

  it("should handle null/undefined gracefully", () => {
    expect(() => {
      validatePlan(null);
    }).toThrow("Invalid MongoDB explain plan format");

    expect(() => {
      validatePlan(undefined);
    }).toThrow("Invalid MongoDB explain plan format");
  });
});
