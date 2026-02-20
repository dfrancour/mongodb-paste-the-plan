import { describe, it, expect } from "vitest";
import { PlanParser, PlanParseError } from "./planParser";
import type { ExplainPlan } from "#types/explain-plan";

describe("PlanParser.detectPlanMode", () => {
  describe("Execution mode detection", () => {
    it("detects execution mode from executionStats.executionStages", () => {
      const plan: ExplainPlan = {
        queryPlanner: {
          winningPlan: { stage: "FETCH" },
        },
        executionStats: {
          executionStages: {
            stage: "FETCH",
            nReturned: 100,
            executionTimeMillis: 5,
          },
        },
      };

      expect(PlanParser.detectPlanMode(plan)).toBe("execution");
    });

    it("detects execution mode from aggregation pipeline with executionStats", () => {
      const plan: ExplainPlan = {
        stages: [
          {
            $cursor: {
              queryPlanner: {
                winningPlan: {
                  stage: "IXSCAN",
                  indexName: "user_id_1",
                } as never,
              },
              executionStats: {
                executionStages: {
                  stage: "IXSCAN",
                  nReturned: 50,
                },
              },
            },
          },
        ],
      };

      expect(PlanParser.detectPlanMode(plan)).toBe("execution");
    });

    it("detects execution mode from sharded executionStats", () => {
      const plan: ExplainPlan = {
        queryPlanner: {
          winningPlan: { stage: "SHARD_MERGE" },
        },
        executionStats: {
          executionStages: {
            stage: "SHARD_MERGE",
            shards: [
              {
                shardName: "shard01",
                executionStages: { stage: "IXSCAN" },
              },
            ],
          },
        },
      };

      expect(PlanParser.detectPlanMode(plan)).toBe("execution");
    });

    it("detects execution mode from direct stage format with execution metrics", () => {
      const plan: ExplainPlan = {
        stage: "COLLSCAN",
        nReturned: 1000,
        docsExamined: 1000,
        executionTimeMillis: 15,
      };

      expect(PlanParser.detectPlanMode(plan)).toBe("execution");
    });

    it("detects execution mode from modern sharded aggregation", () => {
      const plan: ExplainPlan = {
        shards: {
          "shard-01": {
            host: "shard-01.example.com:27017",
            queryPlanner: {
              winningPlan: {
                stage: "GROUP",
              } as never,
            },
            executionStats: {
              executionStages: {
                stage: "GROUP",
                nReturned: 1,
                executionTimeMillis: 10,
              },
            },
          },
        },
      };

      expect(PlanParser.detectPlanMode(plan)).toBe("execution");
    });
  });

  describe("Plan mode detection", () => {
    it("detects plan mode from queryPlanner.winningPlan only", () => {
      const plan: ExplainPlan = {
        queryPlanner: {
          winningPlan: {
            stage: "FETCH",
            inputStage: {
              stage: "IXSCAN",
              indexName: "user_id_1",
            },
          },
        },
      };

      expect(PlanParser.detectPlanMode(plan)).toBe("plan");
    });

    it("detects plan mode from aggregation pipeline without executionStats", () => {
      const plan: ExplainPlan = {
        stages: [
          {
            $cursor: {
              queryPlanner: {
                winningPlan: {
                  stage: "IXSCAN",
                  indexName: "user_id_1",
                } as never,
              },
            },
          },
        ],
      };

      expect(PlanParser.detectPlanMode(plan)).toBe("plan");
    });

    it("detects plan mode from SBE plan with queryPlanner only", () => {
      const plan: ExplainPlan = {
        explainVersion: "2",
        queryPlanner: {
          winningPlan: {
            slotBasedPlan: {
              slots: "s1 = ...",
              stages: "[1] ixscan ...",
            },
            queryPlan: {
              stage: "IXSCAN",
              planNodeId: 1,
            } as never,
          } as never,
        },
      };

      expect(PlanParser.detectPlanMode(plan)).toBe("plan");
    });

    it("detects plan mode from modern sharded aggregation without execution stats", () => {
      const plan: ExplainPlan = {
        shards: {
          "shard-01": {
            host: "shard-01.example.com:27017",
            queryPlanner: {
              winningPlan: {
                stage: "GROUP",
              } as never,
            },
          },
        },
      };

      expect(PlanParser.detectPlanMode(plan)).toBe("plan");
    });
  });

  describe("Error handling", () => {
    it("throws error for empty plan object", () => {
      const plan: ExplainPlan = {};

      expect(() => PlanParser.detectPlanMode(plan)).toThrow(PlanParseError);
      expect(() => PlanParser.detectPlanMode(plan)).toThrow(
        "Cannot determine plan mode",
      );
    });

    it("throws error for plan with neither queryPlanner nor executionStats", () => {
      const plan: ExplainPlan = {
        serverInfo: {
          host: "localhost",
          version: "6.0.0",
        },
      };

      expect(() => PlanParser.detectPlanMode(plan)).toThrow(PlanParseError);
    });

    it("throws error for malformed plan with only command info", () => {
      const plan: ExplainPlan = {
        command: {
          find: "users",
          filter: { status: "active" },
        },
      };

      expect(() => PlanParser.detectPlanMode(plan)).toThrow(PlanParseError);
      expect(() => PlanParser.detectPlanMode(plan)).toThrow(
        "missing both executionStats.executionStages and queryPlanner.winningPlan",
      );
    });
  });

  describe("Edge cases", () => {
    it("prioritizes executionStats over queryPlanner when both exist", () => {
      const plan: ExplainPlan = {
        queryPlanner: {
          winningPlan: { stage: "FETCH" },
        },
        executionStats: {
          executionStages: {
            stage: "FETCH",
            nReturned: 100,
          },
        },
      };

      expect(PlanParser.detectPlanMode(plan)).toBe("execution");
    });

    it("handles plan with empty executionStats object", () => {
      const plan: ExplainPlan = {
        queryPlanner: {
          winningPlan: { stage: "FETCH" },
        },
        executionStats: {},
      };

      // Should fall back to plan mode since executionStats.executionStages is missing
      expect(PlanParser.detectPlanMode(plan)).toBe("plan");
    });

    it("handles aggregation pipeline with empty $cursor", () => {
      const plan: ExplainPlan = {
        stages: [
          {
            $cursor: {
              queryPlanner: {
                winningPlan: { stage: "COLLSCAN" } as never,
              },
            },
          },
        ],
      };

      expect(PlanParser.detectPlanMode(plan)).toBe("plan");
    });
  });
});
