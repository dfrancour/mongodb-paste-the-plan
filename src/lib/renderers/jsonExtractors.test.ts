import { expect, test, describe } from "vitest";
import type { ExplainPlan } from "#types/explain-plan";
import {
  extractPlanSelectionJSON,
  extractServerEnvironmentJSON,
  extractESRAnalysisJSON,
  extractFlowVisualizationJSON,
  extractMongoCommandJSON,
  extractSlotInspectorJSON,
  extractFullExplainPlan,
  extractMinimalJSON,
} from "./jsonExtractors";

// Sample explain plan data for testing
const sampleExplainPlan: ExplainPlan = {
  explainVersion: "1",
  command: {
    find: "collection",
    filter: { field: { $eq: "value" } },
    sort: { field: 1 },
  },
  queryPlanner: {
    plannerVersion: 1,
    namespace: "test.collection",
    indexFilterSet: false,
    parsedQuery: { field: { $eq: "value" } },
    queryHash: "12345678",
    planCacheKey: "87654321",
    optimizationTimeMillis: 15,
    maxIndexedOrSolutionsReached: false,
    maxIndexedAndSolutionsReached: false,
    maxScansToExplodeReached: false,
    winningPlan: {
      queryPlan: {
        stage: "IXSCAN",
        indexName: "field_1",
        keyPattern: { field: 1 },
        indexBounds: { field: ["[value, value]"] },
        direction: "forward",
      },
    },
    rejectedPlans: [],
  },
  executionStats: {
    executionSuccess: true,
    nReturned: 100,
    executionTimeMillis: 25,
    totalKeysExamined: 100,
    totalDocsExamined: 100,
    allPlansExecution: [],
  },
  serverInfo: {
    host: "localhost",
    port: 27017,
    version: "7.0.0",
  },
  serverParameters: {
    internalQueryFrameworkControl: "tryBonsai",
  },
};

describe("JSON Extractors", () => {
  test("extractPlanSelectionJSON should extract relevant plan selection data", () => {
    const result = extractPlanSelectionJSON(sampleExplainPlan);

    expect(result.executionStats?.allPlansExecution).toEqual([]);
  });

  test("extractServerEnvironmentJSON should extract server info and parameters", () => {
    const result = extractServerEnvironmentJSON(sampleExplainPlan);

    expect(result.serverInfo?.host).toBe("localhost");
    expect(result.serverInfo?.port).toBe(27017);
    expect(result.serverInfo?.version).toBe("7.0.0");
    expect(result.serverParameters?.internalQueryFrameworkControl).toBe(
      "tryBonsai",
    );
    expect(result.explainVersion).toBe("1");
  });

  test("extractESRAnalysisJSON should extract query analysis data", () => {
    const result = extractESRAnalysisJSON(sampleExplainPlan);

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.queryPlanner?.parsedQuery).toEqual({
        field: { $eq: "value" },
      });
      expect(result.queryPlanner?.winningPlan?.queryPlan?.stage).toBe("IXSCAN");
    }
  });

  test("extractFlowVisualizationJSON should extract execution plan data", () => {
    const result = extractFlowVisualizationJSON(sampleExplainPlan);

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.queryPlanner?.winningPlan?.queryPlan).toBeDefined();
      expect(result.executionStats?.nReturned).toBe(100);
      expect(result.executionStats?.executionTimeMillis).toBe(25);
      expect(result.executionStats?.totalKeysExamined).toBe(100);
      expect(result.executionStats?.totalDocsExamined).toBe(100);
    }
  });

  test("extractMongoCommandJSON should extract command data", () => {
    const result = extractMongoCommandJSON(sampleExplainPlan);

    expect(result.command).toBeDefined();
    expect(result.command?.find).toBe("collection");
    expect(result.command?.filter).toEqual({ field: { $eq: "value" } });
    expect(result.command?.sort).toEqual({ field: 1 });
  });

  test("extractSlotInspectorJSON should extract SBE data", () => {
    const result = extractSlotInspectorJSON(sampleExplainPlan);

    expect(result.explainVersion).toBe("1");
    expect(result.queryPlanner?.winningPlan?.queryPlan).toBeDefined();
  });

  test("extractFullExplainPlan should return complete plan", () => {
    const result = extractFullExplainPlan(sampleExplainPlan);

    expect(result).toEqual(sampleExplainPlan);
  });

  test("extractMinimalJSON should extract only specified fields", () => {
    const fields = [
      "explainVersion",
      "queryPlanner.namespace",
      "serverInfo.version",
    ];
    const result = extractMinimalJSON(sampleExplainPlan, fields);

    expect(result.explainVersion).toBe("1");
    expect((result.queryPlanner as Record<string, unknown>)?.namespace).toBe(
      "test.collection",
    );
    expect((result.serverInfo as Record<string, unknown>)?.version).toBe(
      "7.0.0",
    );
    expect(result.executionStats).toBeUndefined();
  });

  test("extractors should handle missing data gracefully", () => {
    const emptyPlan: ExplainPlan = {};

    const planSelection = extractPlanSelectionJSON(emptyPlan);
    const serverEnv = extractServerEnvironmentJSON(emptyPlan);
    const esrAnalysis = extractESRAnalysisJSON(emptyPlan);

    expect(planSelection.executionStats?.allPlansExecution).toBeUndefined();
    expect(serverEnv.serverInfo).toBeUndefined();
    expect(esrAnalysis.queryPlanner?.parsedQuery).toBeUndefined();

    // Should not throw errors
    expect(() => extractFlowVisualizationJSON(emptyPlan)).not.toThrow();
    expect(() => extractMongoCommandJSON(emptyPlan)).not.toThrow();
    expect(() => extractSlotInspectorJSON(emptyPlan)).not.toThrow();
  });

  test("extractors should preserve nested object structure", () => {
    const complexPlan: ExplainPlan = {
      queryPlanner: {
        winningPlan: {
          queryPlan: {
            stage: "FETCH",
            inputStage: {
              stage: "IXSCAN",
              indexName: "complex_index",
              keyPattern: { field1: 1, field2: -1 },
              isMultiKey: true,
              isUnique: false,
              multiKeyPaths: { field1: [], field2: ["subfield"] },
            },
          },
        },
      },
    };

    const esrResult = extractESRAnalysisJSON(complexPlan);
    expect("error" in esrResult).toBe(false);
    if (!("error" in esrResult)) {
      expect(esrResult.queryPlanner?.winningPlan?.queryPlan).toBeDefined();
      expect(esrResult.queryPlanner?.winningPlan?.queryPlan?.stage).toBe(
        "FETCH",
      );
    }
  });
});

describe("JSON Extractor Error Handling", () => {
  test("should handle circular references gracefully", () => {
    interface CircularPlan {
      queryPlanner: {
        winningPlan: {
          circular?: CircularPlan;
        };
      };
    }

    const circularPlan: CircularPlan = {
      queryPlanner: {
        winningPlan: {},
      },
    };
    // Create circular reference
    circularPlan.queryPlanner.winningPlan.circular = circularPlan;

    expect(() =>
      extractPlanSelectionJSON(circularPlan as unknown as ExplainPlan),
    ).not.toThrow();
    expect(() =>
      extractServerEnvironmentJSON(circularPlan as unknown as ExplainPlan),
    ).not.toThrow();
  });

  test("should handle deeply nested structures", () => {
    const deepPlan: ExplainPlan = {
      queryPlanner: {
        winningPlan: {
          queryPlan: {
            stage: "PROJECTION_DEFAULT",
            inputStage: {
              stage: "SORT",
              inputStage: {
                stage: "FETCH",
                inputStage: {
                  stage: "IXSCAN",
                  indexName: "deep_index",
                },
              },
            },
          },
        },
      },
    };

    const result = extractESRAnalysisJSON(deepPlan);
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.queryPlanner?.winningPlan?.queryPlan).toBeDefined();
      expect(result.queryPlanner?.winningPlan?.queryPlan?.stage).toBe(
        "PROJECTION_DEFAULT",
      );
    }
  });
});
