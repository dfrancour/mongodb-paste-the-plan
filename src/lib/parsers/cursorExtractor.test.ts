import { describe, it, expect } from "vitest";
import {
  extractCursorContent,
  extractCursorFromPlan,
  getCursorContent,
  getCursorContentFromPlan,
  isCursorStage,
} from "./cursorExtractor";
import type { ExplainPlan } from "#types/explain-plan";

describe("cursorExtractor", () => {
  describe("extractCursorContent", () => {
    it("should extract content from $cursor stage", () => {
      const stage = {
        $cursor: {
          queryPlanner: { namespace: "db.collection" },
          executionStats: { nReturned: 100 },
        },
      };

      const result = extractCursorContent(stage);

      expect(result).not.toBeNull();
      expect(result?.cursorKey).toBe("$cursor");
      expect(result?.content.queryPlanner).toEqual({
        namespace: "db.collection",
      });
      expect(result?.content.executionStats).toEqual({ nReturned: 100 });
    });

    it("should extract content from $geoNearCursor stage", () => {
      const stage = {
        $geoNearCursor: {
          queryPlanner: {
            namespace: "airbnb.listings",
            winningPlan: { stage: "GEO_NEAR_2DSPHERE" },
          },
          executionStats: {
            executionSuccess: true,
            nReturned: 16116,
            executionStages: { stage: "GEO_NEAR_2DSPHERE" },
          },
        },
      };

      const result = extractCursorContent(stage);

      expect(result).not.toBeNull();
      expect(result?.cursorKey).toBe("$geoNearCursor");
      expect(result?.content.queryPlanner?.namespace).toBe("airbnb.listings");
      expect(result?.content.executionStats?.nReturned).toBe(16116);
    });

    it("should return null for non-cursor stages", () => {
      const stage = {
        $match: { status: "active" },
      };

      const result = extractCursorContent(stage);

      expect(result).toBeNull();
    });

    it("should return null for stages without queryPlanner or executionStats", () => {
      const stage = {
        $cursor: { someOtherField: "value" },
      };

      const result = extractCursorContent(stage);

      expect(result).toBeNull();
    });

    it("should return null for null input", () => {
      expect(extractCursorContent(null)).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(extractCursorContent(undefined)).toBeNull();
    });

    it("should return null for primitive input", () => {
      expect(extractCursorContent("string")).toBeNull();
      expect(extractCursorContent(123)).toBeNull();
      expect(extractCursorContent(true)).toBeNull();
    });

    it("should detect cursor by queryPlanner alone", () => {
      const stage = {
        $cursor: {
          queryPlanner: { namespace: "db.collection" },
        },
      };

      const result = extractCursorContent(stage);

      expect(result).not.toBeNull();
      expect(result?.cursorKey).toBe("$cursor");
    });

    it("should detect cursor by executionStats alone", () => {
      const stage = {
        $cursor: {
          executionStats: { nReturned: 100 },
        },
      };

      const result = extractCursorContent(stage);

      expect(result).not.toBeNull();
      expect(result?.cursorKey).toBe("$cursor");
    });

    it("should handle hypothetical future cursor types", () => {
      const stage = {
        $futureCursor: {
          queryPlanner: { namespace: "db.collection" },
          executionStats: { nReturned: 100 },
        },
      };

      const result = extractCursorContent(stage);

      expect(result).not.toBeNull();
      expect(result?.cursorKey).toBe("$futureCursor");
    });
  });

  describe("extractCursorFromPlan", () => {
    it("should extract cursor from plan with stages array", () => {
      const plan: ExplainPlan = {
        explainVersion: "1",
        stages: [
          {
            $cursor: {
              queryPlanner: { namespace: "db.collection" },
            },
          },
          { $match: {} },
        ],
      };

      const result = extractCursorFromPlan(plan);

      expect(result).not.toBeNull();
      expect(result?.cursorKey).toBe("$cursor");
    });

    it("should return null for plan without stages", () => {
      const plan: ExplainPlan = {
        explainVersion: "1",
        queryPlanner: { winningPlan: { stage: "COLLSCAN" } },
      };

      const result = extractCursorFromPlan(plan);

      expect(result).toBeNull();
    });

    it("should return null for plan with empty stages array", () => {
      const plan: ExplainPlan = {
        explainVersion: "1",
        stages: [],
      };

      const result = extractCursorFromPlan(plan);

      expect(result).toBeNull();
    });

    it("should return null when first stage is not a cursor", () => {
      const plan: ExplainPlan = {
        explainVersion: "1",
        stages: [{ $match: { status: "active" } }],
      };

      const result = extractCursorFromPlan(plan);

      expect(result).toBeNull();
    });
  });

  describe("getCursorContent", () => {
    it("should return cursor content without key name", () => {
      const stage = {
        $cursor: {
          queryPlanner: { namespace: "db.collection" },
        },
      };

      const result = getCursorContent(stage);

      expect(result).not.toBeNull();
      expect(result?.queryPlanner).toEqual({ namespace: "db.collection" });
    });

    it("should return null for non-cursor stage", () => {
      const stage = { $match: {} };

      const result = getCursorContent(stage);

      expect(result).toBeNull();
    });
  });

  describe("getCursorContentFromPlan", () => {
    it("should return cursor content from plan", () => {
      const plan: ExplainPlan = {
        explainVersion: "1",
        stages: [
          {
            $geoNearCursor: {
              queryPlanner: { namespace: "airbnb.listings" },
              executionStats: { nReturned: 16116 },
            },
          },
        ],
      };

      const result = getCursorContentFromPlan(plan);

      expect(result).not.toBeNull();
      expect(result?.queryPlanner?.namespace).toBe("airbnb.listings");
      expect(result?.executionStats?.nReturned).toBe(16116);
    });

    it("should return null for plan without cursor", () => {
      const plan: ExplainPlan = {
        explainVersion: "1",
        queryPlanner: { winningPlan: { stage: "COLLSCAN" } },
      };

      const result = getCursorContentFromPlan(plan);

      expect(result).toBeNull();
    });
  });

  describe("isCursorStage", () => {
    it("should return true for $cursor stage", () => {
      const stage = {
        $cursor: {
          queryPlanner: { namespace: "db.collection" },
        },
      };

      expect(isCursorStage(stage)).toBe(true);
    });

    it("should return true for $geoNearCursor stage", () => {
      const stage = {
        $geoNearCursor: {
          queryPlanner: { namespace: "db.collection" },
        },
      };

      expect(isCursorStage(stage)).toBe(true);
    });

    it("should return false for non-cursor stages", () => {
      expect(isCursorStage({ $match: {} })).toBe(false);
      expect(isCursorStage({ $group: {} })).toBe(false);
      expect(isCursorStage({ $project: {} })).toBe(false);
    });

    it("should return false for null/undefined", () => {
      expect(isCursorStage(null)).toBe(false);
      expect(isCursorStage(undefined)).toBe(false);
    });
  });

  describe("real-world $geoNearCursor plan", () => {
    it("should correctly extract execution stages from $geoNearCursor plan", () => {
      // Simplified version of the actual $geoNearCursor explain plan
      const plan: ExplainPlan = {
        explainVersion: "1",
        stages: [
          {
            $geoNearCursor: {
              queryPlanner: {
                namespace: "airbnb.listings",
                indexFilterSet: false,
                parsedQuery: {
                  location: {
                    $near: {
                      type: "Point",
                      coordinates: [52.5312957, 13.3328254],
                    },
                    $maxDistance: 10000000,
                  },
                },
                winningPlan: {
                  stage: "GEO_NEAR_2DSPHERE",
                  keyPattern: { location: "2dsphere" },
                  indexName: "location_2dsphere",
                  inputStage: {
                    stage: "FETCH",
                    inputStage: {
                      stage: "IXSCAN",
                      keyPattern: { location: "2dsphere" },
                      indexName: "location_2dsphere",
                    },
                  },
                },
              },
              executionStats: {
                executionSuccess: true,
                nReturned: 16116,
                executionTimeMillis: 205,
                totalKeysExamined: 16116,
                totalDocsExamined: 16116,
                executionStages: {
                  stage: "GEO_NEAR_2DSPHERE",
                  nReturned: 16116,
                  executionTimeMillisEstimate: 40,
                  works: 32259,
                  inputStage: {
                    stage: "FETCH",
                    nReturned: 16116,
                    docsExamined: 16116,
                    inputStage: {
                      stage: "IXSCAN",
                      nReturned: 16116,
                      keysExamined: 16116,
                    },
                  },
                },
              },
            },
            nReturned: 16116,
            executionTimeMillisEstimate: 176,
          },
        ],
        serverInfo: {
          host: "e2f43dc8d2c8",
          port: 27017,
          version: "5.0.3",
        },
        ok: 1,
      };

      const cursorContent = getCursorContentFromPlan(plan);

      // Verify we can extract the cursor content
      expect(cursorContent).not.toBeNull();

      // Verify queryPlanner data
      expect(cursorContent?.queryPlanner?.namespace).toBe("airbnb.listings");
      expect(cursorContent?.queryPlanner?.winningPlan?.stage).toBe(
        "GEO_NEAR_2DSPHERE",
      );

      // Verify executionStats data
      expect(cursorContent?.executionStats?.executionSuccess).toBe(true);
      expect(cursorContent?.executionStats?.nReturned).toBe(16116);
      expect(cursorContent?.executionStats?.executionTimeMillis).toBe(205);

      // Verify executionStages (the key data needed for visualization)
      const execStages = cursorContent?.executionStats?.executionStages;
      expect(execStages).toBeDefined();
      expect(execStages?.stage).toBe("GEO_NEAR_2DSPHERE");
      expect(execStages?.nReturned).toBe(16116);
    });
  });
});
