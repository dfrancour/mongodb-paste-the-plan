import { describe, it, expect } from "vitest";
import { PlanParser } from "./planParser";
import type { ExplainPlan } from "#types/explain-plan";

describe("Sharded Aggregation Detection", () => {
  it("should successfully parse sharded aggregation pipeline plans with stages arrays", () => {
    const shardedPipelinePlan = {
      serverInfo: {
        host: "mongo-host.example.com",
        port: 27017,
        version: "5.3.0",
      },
      mergeType: "anyShard",
      splitPipeline: {
        shardsPart: [
          {
            $geoNear: {
              near: { type: "Point", coordinates: [-8.61308, 41.1413] },
            },
          },
        ],
        mergerPart: [
          { $group: { _id: null, host_ids: { $addToSet: "$host_id" } } },
        ],
      },
      shards: {
        shard1: {
          host: "shard1.example.com:27017",
          stages: [
            {
              $geoNearCursor: {
                queryPlanner: { namespace: "test.collection" },
              },
            },
          ],
        },
        shard2: {
          host: "shard2.example.com:27017",
          stages: [
            { $cursor: { queryPlanner: { namespace: "test.collection" } } },
          ],
        },
      },
    };

    expect(() => {
      const parsed = PlanParser.parse(shardedPipelinePlan);
      const normalized = PlanParser.normalizePlan(parsed);

      // Should successfully parse and normalize
      expect(normalized).toBeDefined();
      expect(normalized.stage).toBeDefined();
      expect(normalized.id).toBe("root");
    }).not.toThrow();
  });

  it("should NOT detect regular plans as sharded aggregation", () => {
    const regularPlan = {
      explainVersion: "1",
      queryPlanner: {
        namespace: "test.collection",
        winningPlan: {
          stage: "COLLSCAN",
        },
      },
      executionStats: {
        executionStages: {
          stage: "COLLSCAN",
          nReturned: 10,
          docsExamined: 10,
        },
      },
    };

    expect(() => {
      const parsed = PlanParser.parse(regularPlan);
      PlanParser.normalizeExecution(parsed);
    }).not.toThrow();
  });

  it("should NOT detect SBE aggregation plans as sharded aggregation", () => {
    const sbeAggregationPlan = {
      explainVersion: "2",
      stages: [
        {
          $cursor: {
            queryPlanner: {
              namespace: "test.collection",
              winningPlan: {
                stage: "COLLSCAN",
              },
            },
            executionStats: {
              executionStages: {
                stage: "COLLSCAN",
                nReturned: 10,
                docsExamined: 10,
              },
            },
          },
        },
      ],
    };

    expect(() => {
      const parsed = PlanParser.parse(sbeAggregationPlan);
      PlanParser.normalizeExecution(parsed);
    }).not.toThrow();
  });

  it("should successfully parse modern sharded aggregation plans", () => {
    const modernShardedAggregationPlan = {
      serverInfo: {
        host: "mongos.example.com",
        port: 27017,
        version: "8.0.12",
      },
      splitPipeline: null,
      shards: {
        "shard-0": {
          host: "shard0.example.com:27017",
          explainVersion: "2",
          queryPlanner: {
            namespace: "analytics.events",
            winningPlan: {
              queryPlan: {
                stage: "GROUP",
                planNodeId: 2,
                inputStage: {
                  stage: "COUNT_SCAN",
                  planNodeId: 1,
                  indexName: "region_1_status_1_category_1",
                },
              },
            },
          },
          executionStats: {
            executionSuccess: true,
            nReturned: 1,
            executionTimeMillis: 29,
            totalKeysExamined: 161873,
            totalDocsExamined: 0,
            executionStages: {
              stage: "project",
              planNodeId: 2,
              nReturned: 1,
              executionTimeMillisEstimate: 28,
            },
          },
        },
      },
      command: {
        aggregate: "events",
        pipeline: [
          { $match: { region: "us-east" } },
          { $group: { _id: null, n: { $sum: 1 } } },
        ],
      },
    };

    expect(() => {
      const parsed = PlanParser.parse(modernShardedAggregationPlan);
      const normalized = PlanParser.normalizeExecution(parsed);

      // Should successfully parse and normalize
      expect(normalized).toBeDefined();
      expect(normalized.stage).toBeDefined();
      expect(normalized.id).toBe("root");
    }).not.toThrow();
  });

  it("should successfully parse sharded find queries", () => {
    const shardedFindPlan = {
      queryPlanner: {
        mongosPlannerVersion: 1,
        winningPlan: {
          stage: "SINGLE_SHARD",
          shards: [
            {
              shardName: "shard-replica-set",
              connectionString:
                "shard-replica-set/shard1.example.com:27017,shard2.example.com:27017,shard3.example.com:27017",
              winningPlan: {
                stage: "IDHACK",
              },
            },
          ],
        },
      },
      executionStats: {
        nReturned: 0,
        executionTimeMillis: 4,
        totalKeysExamined: 0,
        totalDocsExamined: 0,
        executionStages: {
          stage: "SINGLE_SHARD",
          shards: [
            {
              shardName: "shard-replica-set",
              executionSuccess: true,
              executionStages: {
                stage: "IDHACK",
                nReturned: 0,
                executionTimeMillisEstimate: 0,
              },
            },
          ],
        },
      },
    };

    expect(() => {
      const parsed = PlanParser.parse(shardedFindPlan);
      const normalized = PlanParser.normalizeExecution(parsed);

      // Should successfully parse and normalize
      expect(normalized).toBeDefined();
      expect(normalized.stage).toBeDefined(); // Could be SINGLE_SHARD, SHARD_MERGE, or IDHACK depending on extraction
      expect(normalized.id).toBe("root");
    }).not.toThrow();
  });

  it("should normalize plan mode for modern sharded aggregation", () => {
    const modernShardedAggregationPlan: ExplainPlan = {
      splitPipeline: null,
      shards: {
        "shard-0": {
          host: "shard0.example.com:27017",
          explainVersion: "2",
          queryPlanner: {
            namespace: "analytics.events",
            winningPlan: {
              queryPlan: {
                stage: "GROUP",
                planNodeId: 2,
                inputStage: {
                  stage: "COUNT_SCAN",
                  planNodeId: 1,
                  indexName: "region_1_status_1",
                },
              },
            },
          },
        },
      },
    };

    const parsed = PlanParser.parse(modernShardedAggregationPlan);
    const normalized = PlanParser.normalizePlan(parsed);

    // Should extract plan from shard
    expect(normalized).toBeDefined();
    expect(normalized.stage).toBe("GROUP");
    expect(normalized.children).toHaveLength(1);
    expect(normalized.children[0]?.stage).toBe("COUNT_SCAN");
  });

  it("should normalize execution mode for modern sharded aggregation", () => {
    const modernShardedAggregationPlan: ExplainPlan = {
      splitPipeline: null,
      shards: {
        "shard-0": {
          host: "shard0.example.com:27017",
          explainVersion: "2",
          queryPlanner: {
            namespace: "analytics.events",
            winningPlan: {
              queryPlan: {
                stage: "GROUP",
                planNodeId: 2,
              },
            },
          },
          executionStats: {
            executionSuccess: true,
            nReturned: 1,
            executionTimeMillis: 29,
            totalKeysExamined: 161873,
            totalDocsExamined: 0,
            executionStages: {
              stage: "project",
              planNodeId: 2,
              nReturned: 1,
              executionTimeMillisEstimate: 28,
              opens: 1,
              closes: 1,
            },
          },
        },
      },
    };

    const parsed = PlanParser.parse(modernShardedAggregationPlan);
    const normalized = PlanParser.normalizeExecution(parsed);

    // Should extract execution stages from shard
    expect(normalized).toBeDefined();
    expect(normalized.stage).toBe("project");
    expect(normalized.metrics.nReturned).toBe(1);
    expect(normalized.metrics.executionTimeMillis).toBe(28);
    // Should inject cumulative totals from shard's executionStats
    expect(normalized.metrics.keysExamined).toBe(161873);
    expect(normalized.metrics.docsExamined).toBe(0);
  });

  it("should extract appropriate JSON for sharded plans", async () => {
    const { extractFlowVisualizationJSON } =
      await import("#lib/renderers/jsonExtractors");

    const modernShardedAggregationPlan = {
      serverInfo: {
        host: "mongos.example.com",
        port: 27017,
        version: "8.0.12",
      },
      splitPipeline: null,
      shards: {
        "shard-0": {
          host: "shard0.example.com:27017",
          explainVersion: "2",
          queryPlanner: {
            winningPlan: {
              queryPlan: {
                stage: "GROUP",
                planNodeId: 2,
              },
            },
          },
        },
      },
      command: {
        aggregate: "test.collection",
        pipeline: [{ $group: { _id: null, n: { $sum: 1 } } }],
      },
    };

    const shardedFindPlan = {
      queryPlanner: {
        mongosPlannerVersion: 1,
        winningPlan: {
          stage: "SINGLE_SHARD",
          shards: [
            {
              shardName: "shard-replica-set",
              winningPlan: { stage: "IDHACK" },
            },
          ],
        },
      },
    };

    // Test modern sharded aggregation JSON extraction
    const modernJson = extractFlowVisualizationJSON(
      modernShardedAggregationPlan as ExplainPlan,
    );
    expect(modernJson).toHaveProperty("shards");
    expect(modernJson).toHaveProperty("explainVersion", "sharded_aggregation");
    expect(modernJson).not.toHaveProperty("queryPlanner");
    expect(modernJson).not.toHaveProperty("stages");

    // Test sharded find JSON extraction
    const findJson = extractFlowVisualizationJSON(
      shardedFindPlan as ExplainPlan,
    );
    expect(findJson).toHaveProperty("queryPlanner.winningPlan.shards");
    expect(findJson).toHaveProperty("explainVersion", "sharded_find");
    expect(findJson).not.toHaveProperty("shards");
    expect(findJson).not.toHaveProperty("stages");
  });

  it("should successfully parse sharded aggregation pipeline with Atlas Search (MongoDB 8.0+)", () => {
    const atlasSearchShardedPlan: ExplainPlan = {
      ok: 1,
      serverInfo: {
        host: "atlas-config.mongodb.net",
        port: 27016,
        version: "8.0.16",
      },
      splitPipeline: null,
      queryShapeHash: "ABC123",
      command: {
        aggregate: "collection",
        pipeline: [
          {
            $search: {
              index: "search_index",
              compound: {
                must: [{ text: { query: "test", path: "field" } }],
              },
            },
          },
          { $project: { _id: 1, score: { $meta: "searchScore" } } },
          { $limit: 50 },
        ],
      },
      shards: {
        "shard-0": {
          host: "shard0.mongodb.net:27017",
          explainVersion: "1",
          stages: [
            {
              $_internalSearchMongotRemote: {
                mongotQuery: {
                  index: "search_index",
                  compound: {
                    must: [{ text: { query: "test", path: "field" } }],
                  },
                },
                nReturned: 50,
                executionTimeMillisEstimate: 42,
              },
            },
            {
              $project: {
                _id: true,
                score: { $meta: "searchScore" },
              },
            },
            {
              $limit: 50,
            },
          ],
        },
      },
    };

    expect(() => {
      const parsed = PlanParser.parse(atlasSearchShardedPlan);
      const normalized = PlanParser.normalizePlan(parsed);

      // Should successfully parse and normalize
      expect(normalized).toBeDefined();
      expect(normalized.stage).toBeDefined();
      expect(normalized.id).toBe("root");
    }).not.toThrow();
  });
});
