import { describe, it, expect } from "vitest";
import { PlanParser } from "./planParser";

describe("Extended JSON Parsing", () => {
  it("should transform MongoDB Extended JSON format correctly", () => {
    const extendedJsonPlan = {
      explainVersion: "1",
      executionStats: {
        nReturned: { $numberInt: "1000" },
        executionTimeMillis: { $numberInt: "25" },
        totalKeysExamined: { $numberInt: "1001" },
        totalDocsExamined: { $numberInt: "1000" },
        executionStages: {
          stage: "FETCH",
          nReturned: { $numberInt: "1000" },
          executionTimeMillisEstimate: { $numberInt: "20" },
          advanced: { $numberInt: "1000" },
          works: { $numberInt: "1002" },
          docsExamined: { $numberInt: "1000" },
          inputStage: {
            stage: "IXSCAN",
            nReturned: { $numberInt: "1000" },
            keysExamined: { $numberInt: "1001" },
            indexName: "field_1_otherfield_1",
          },
        },
      },
      queryPlanner: {
        optimizationTimeMillis: { $numberInt: "5" },
        winningPlan: {
          stage: "FETCH",
          inputStage: {
            stage: "IXSCAN",
            indexName: "field_1_otherfield_1",
          },
        },
      },
      ok: { $numberDouble: "1.0" },
    };

    // This should not throw an error
    const parsedPlan = PlanParser.parse(extendedJsonPlan);

    // Verify that Extended JSON values were converted to regular numbers
    expect(parsedPlan.executionStats?.nReturned).toBe(1000);
    expect(parsedPlan.executionStats?.executionTimeMillis).toBe(25);
    expect(parsedPlan.executionStats?.totalKeysExamined).toBe(1001);
    expect(parsedPlan.executionStats?.totalDocsExamined).toBe(1000);
    expect(parsedPlan.queryPlanner?.optimizationTimeMillis).toBe(5);
    expect(parsedPlan.ok).toBe(1.0);

    // Verify types are correct
    expect(typeof parsedPlan.executionStats?.nReturned).toBe("number");
    expect(typeof parsedPlan.executionStats?.executionTimeMillis).toBe(
      "number",
    );
    expect(typeof parsedPlan.queryPlanner?.optimizationTimeMillis).toBe(
      "number",
    );
    expect(typeof parsedPlan.ok).toBe("number");
  });

  it("should handle nested Extended JSON correctly", () => {
    const nestedExtendedJson = {
      explainVersion: "1",
      executionStats: {
        nReturned: { $numberInt: "100" },
        executionTimeMillis: { $numberLong: "150" },
        executionStages: {
          stage: "FETCH",
          nReturned: { $numberInt: "100" },
        },
      },
      queryPlanner: {
        optimizationTimeMillis: { $numberDouble: "5.5" },
        winningPlan: {
          stage: "FETCH",
        },
      },
    };

    const parsedPlan = PlanParser.parse(nestedExtendedJson);

    // Check nested transformations
    expect(parsedPlan.executionStats?.nReturned).toBe(100);
    expect(parsedPlan.executionStats?.executionTimeMillis).toBe(150);
    expect(parsedPlan.queryPlanner?.optimizationTimeMillis).toBe(5.5);
    expect(typeof parsedPlan.executionStats?.nReturned).toBe("number");
    expect(typeof parsedPlan.executionStats?.executionTimeMillis).toBe(
      "number",
    );
    expect(typeof parsedPlan.queryPlanner?.optimizationTimeMillis).toBe(
      "number",
    );
  });

  it("should preserve non-numeric Extended JSON types", () => {
    const mixedExtendedJson = {
      explainVersion: "1",
      executionStats: {
        nReturned: { $numberInt: "42" },
        executionStages: {
          stage: "FETCH",
        },
      },
      queryPlanner: {
        winningPlan: {
          stage: "FETCH",
        },
      },
      operationTime: {
        $timestamp: {
          t: 1234567890,
          i: 1000,
        },
      },
      clusterInfo: {
        signature: {
          hash: {
            $binary: {
              base64: "dGVzdGhhc2g=",
              subType: "00",
            },
          },
        },
      },
    };

    const parsedPlan = PlanParser.parse(mixedExtendedJson);

    // Numbers should be converted
    expect(parsedPlan.executionStats?.nReturned).toBe(42);
    expect(typeof parsedPlan.executionStats?.nReturned).toBe("number");

    // Timestamps and binary data should be preserved as objects
    expect(parsedPlan.operationTime).toEqual({
      $timestamp: {
        t: 1234567890,
        i: 1000,
      },
    });
    // Binary data structures are preserved (not transformed)
  });

  it("should handle arrays containing Extended JSON", () => {
    const arrayExtendedJson = {
      explainVersion: "1",
      executionStats: {
        allPlansExecution: [
          {
            nReturned: { $numberInt: "50" },
            executionTimeMillisEstimate: { $numberDouble: "2.5" },
          },
          {
            nReturned: { $numberInt: "75" },
            executionTimeMillisEstimate: { $numberDouble: "3.0" },
          },
        ],
        executionStages: {
          stage: "FETCH",
        },
      },
      queryPlanner: {
        winningPlan: {
          stage: "FETCH",
        },
      },
    };

    const parsedPlan = PlanParser.parse(arrayExtendedJson);

    // Check array elements were transformed
    const allPlans = parsedPlan.executionStats?.allPlansExecution;
    expect(allPlans).toBeDefined();
    expect(allPlans?.[0]?.nReturned).toBe(50);
    expect(allPlans?.[0]?.executionTimeMillisEstimate).toBe(2.5);
    expect(allPlans?.[1]?.nReturned).toBe(75);
    expect(allPlans?.[1]?.executionTimeMillisEstimate).toBe(3.0);

    // Check types
    expect(typeof allPlans?.[0]?.nReturned).toBe("number");
    expect(typeof allPlans?.[0]?.executionTimeMillisEstimate).toBe("number");
  });

  it("should successfully parse and normalize Extended JSON explain plans", () => {
    // Generic structure similar to the reported issue
    const extendedJsonPlan = {
      explainVersion: "1",
      queryPlanner: {
        optimizationTimeMillis: { $numberInt: "4" },
        winningPlan: {
          stage: "FETCH",
          inputStage: {
            stage: "IXSCAN",
            indexName: "compound_index_1_2",
            keyPattern: {
              field1: { $numberInt: "1" },
              field2: { $numberInt: "1" },
            },
          },
        },
      },
      executionStats: {
        nReturned: { $numberInt: "500" },
        executionTimeMillis: { $numberInt: "15" },
        totalKeysExamined: { $numberInt: "501" },
        totalDocsExamined: { $numberInt: "500" },
        executionStages: {
          stage: "FETCH",
          nReturned: { $numberInt: "500" },
          executionTimeMillisEstimate: { $numberInt: "12" },
          advanced: { $numberInt: "500" },
          works: { $numberInt: "502" },
          docsExamined: { $numberInt: "500" },
          inputStage: {
            stage: "IXSCAN",
            nReturned: { $numberInt: "500" },
            keysExamined: { $numberInt: "501" },
            indexName: "compound_index_1_2",
          },
        },
      },
    };

    // Should parse without throwing
    const parsedPlan = PlanParser.parse(extendedJsonPlan);
    expect(parsedPlan).toBeDefined();

    // Should normalize without throwing
    const normalizedPlan = PlanParser.normalizeExecution(parsedPlan);
    expect(normalizedPlan).toBeDefined();
    expect(normalizedPlan.stage).toBe("FETCH");
    expect(normalizedPlan.children).toHaveLength(1);
    expect(normalizedPlan.children[0]?.stage).toBe("IXSCAN");

    // Check metrics were correctly transformed
    expect(normalizedPlan.metrics.nReturned).toBe(500);
    expect(normalizedPlan.metrics.executionTimeMillis).toBe(12);
    expect(normalizedPlan.children[0]?.metrics.keysExamined).toBe(501);
  });
});
