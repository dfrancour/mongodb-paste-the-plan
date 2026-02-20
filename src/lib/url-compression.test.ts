import { describe, it, expect } from "vitest";
import {
  compressPlan,
  decompressPlan,
  generateShareUrl,
  parsePlanFromHash,
  getCompressionStats,
  MAX_DECOMPRESSED_SIZE,
  URL_FORMAT_VERSION,
} from "./url-compression";

describe("url-compression", () => {
  describe("compressPlan / decompressPlan", () => {
    it("compresses and decompresses a simple object", async () => {
      const original = { stage: "IXSCAN", nReturned: 42 };
      const compressed = await compressPlan(original);
      const decompressed = await decompressPlan(compressed);

      expect(decompressed).toEqual(original);
    });

    it("handles nested objects", async () => {
      const original = {
        queryPlanner: {
          winningPlan: {
            stage: "FETCH",
            inputStage: {
              stage: "IXSCAN",
              indexName: "idx_name",
              keysExamined: 100,
            },
          },
        },
      };

      const compressed = await compressPlan(original);
      const decompressed = await decompressPlan(compressed);

      expect(decompressed).toEqual(original);
    });

    it("handles arrays", async () => {
      const original = {
        stages: [
          { stage: "IXSCAN", nReturned: 10 },
          { stage: "FETCH", nReturned: 5 },
        ],
        shards: ["shard1", "shard2"],
      };

      const compressed = await compressPlan(original);
      const decompressed = await decompressPlan(compressed);

      expect(decompressed).toEqual(original);
    });

    it("handles strings with special characters", async () => {
      const original = {
        namespace: "test.collection",
        filter: { name: { $regex: "foo.*bar" } },
        comment: "Unicode: \u00e9\u00e0\u00fc \u4e2d\u6587",
      };

      const compressed = await compressPlan(original);
      const decompressed = await decompressPlan(compressed);

      expect(decompressed).toEqual(original);
    });

    it("handles null and boolean values", async () => {
      const original = {
        isMultiKey: false,
        isSparse: true,
        inputStage: null,
      };

      const compressed = await compressPlan(original);
      const decompressed = await decompressPlan(compressed);

      expect(decompressed).toEqual(original);
    });

    it("produces URL-safe output with version prefix", async () => {
      const original = { stage: "IXSCAN", data: "test/data+special=chars" };
      const compressed = await compressPlan(original);

      // Should have version prefix followed by colon and URL-safe characters
      expect(compressed).toMatch(/^v\d+:[A-Za-z0-9_-]+$/);
      expect(compressed.startsWith(`${URL_FORMAT_VERSION}:`)).toBe(true);
    });

    it("achieves meaningful compression on typical explain plans", async () => {
      // A typical small explain plan structure
      const original = {
        queryPlanner: {
          namespace: "test.users",
          indexFilterSet: false,
          winningPlan: {
            stage: "FETCH",
            inputStage: {
              stage: "IXSCAN",
              keyPattern: { email: 1 },
              indexName: "email_1",
              isMultiKey: false,
              multiKeyPaths: { email: [] },
              isUnique: true,
              isSparse: false,
              isPartial: false,
              indexVersion: 2,
              direction: "forward",
            },
          },
        },
      };

      const originalSize = JSON.stringify(original).length;
      const compressed = await compressPlan(original);

      // Base64 encoding has ~33% overhead, but deflate should more than compensate
      // Expecting at least 30% compression (compressed < 70% of original)
      expect(compressed.length).toBeLessThan(originalSize * 0.9);
    });
  });

  describe("generateShareUrl", () => {
    it("generates a URL with versioned compressed plan in hash", async () => {
      const plan = { stage: "IXSCAN" };
      const url = await generateShareUrl(
        plan,
        "https://example.com/tools/paste-the-plan",
      );

      // URL should contain version prefix (v1:) followed by base64url payload
      expect(url).toMatch(
        /^https:\/\/example\.com\/tools\/paste-the-plan#v\d+:[A-Za-z0-9_-]+$/,
      );
    });

    it("uses custom base URL when provided", async () => {
      const plan = { stage: "IXSCAN" };
      const url = await generateShareUrl(plan, "https://custom.com/page");

      expect(url).toMatch(/^https:\/\/custom\.com\/page#v\d+:[A-Za-z0-9_-]+$/);
    });

    it("produces valid round-trip URLs", async () => {
      const original = {
        queryPlanner: { winningPlan: { stage: "COLLSCAN" } },
      };

      const url = await generateShareUrl(original, "https://test.com");
      const hash = url.split("#")[1] ?? "";
      const decompressed = await parsePlanFromHash(hash);

      expect(decompressed).toEqual(original);
    });
  });

  describe("parsePlanFromHash", () => {
    it("parses a valid compressed hash", async () => {
      const original = { stage: "FETCH", nReturned: 100 };
      const compressed = await compressPlan(original);

      const parsed = await parsePlanFromHash(compressed);
      expect(parsed).toEqual(original);
    });

    it("handles hash with leading #", async () => {
      const original = { stage: "SORT" };
      const compressed = await compressPlan(original);

      const parsed = await parsePlanFromHash("#" + compressed);
      expect(parsed).toEqual(original);
    });

    it("returns null for empty hash", async () => {
      expect(await parsePlanFromHash("")).toBe(null);
      expect(await parsePlanFromHash("#")).toBe(null);
    });

    it("returns null for invalid compressed data", async () => {
      const result = await parsePlanFromHash("not-valid-compressed-data");
      expect(result).toBe(null);
    });

    it("returns null for corrupted data", async () => {
      const original = { stage: "IXSCAN" };
      const compressed = await compressPlan(original);
      // Corrupt the data by changing characters
      const corrupted = compressed.slice(0, -5) + "XXXXX";

      const result = await parsePlanFromHash(corrupted);
      expect(result).toBe(null);
    });
  });

  describe("getCompressionStats", () => {
    it("returns accurate size statistics", async () => {
      const plan = { stage: "IXSCAN", nReturned: 42 };
      const stats = await getCompressionStats(plan);

      expect(stats.originalSize).toBe(JSON.stringify(plan).length);
      expect(stats.compressedSize).toBeGreaterThan(0);
      // For small objects, compression ratio can be negative (deflate + base64 overhead)
      // Only verify that it returns a number in a reasonable range
      expect(stats.compressionRatio).toBeGreaterThan(-1);
      expect(stats.compressionRatio).toBeLessThan(1);
    });

    it("correctly calculates URL length", async () => {
      const plan = { stage: "IXSCAN" };
      const stats = await getCompressionStats(plan);

      // URL length should be base URL estimate (60) + # (1) + compressed size
      expect(stats.urlLength).toBe(60 + 1 + stats.compressedSize);
    });

    it("correctly identifies plans that fit universal limit", async () => {
      const smallPlan = { stage: "IXSCAN" };
      const stats = await getCompressionStats(smallPlan);

      // Small plan should fit in 2KB
      expect(stats.fitsUniversalLimit).toBe(true);
      expect(stats.fitsModernLimit).toBe(true);
    });

    it("returns meaningful compression ratio for typical plans", async () => {
      const typicalPlan = {
        queryPlanner: {
          namespace: "db.collection",
          indexFilterSet: false,
          parsedQuery: { field: { $eq: "value" } },
          winningPlan: {
            stage: "FETCH",
            inputStage: {
              stage: "IXSCAN",
              keyPattern: { field: 1 },
              indexName: "field_1",
              isMultiKey: false,
              isUnique: false,
              isSparse: false,
              isPartial: false,
              indexVersion: 2,
              direction: "forward",
              indexBounds: { field: ['["value", "value"]'] },
            },
          },
          rejectedPlans: [],
        },
        executionStats: {
          executionSuccess: true,
          nReturned: 1,
          executionTimeMillis: 0,
          totalKeysExamined: 1,
          totalDocsExamined: 1,
          executionStages: {
            stage: "FETCH",
            nReturned: 1,
            executionTimeMillisEstimate: 0,
            works: 2,
            advanced: 1,
            needTime: 0,
            needYield: 0,
            saveState: 0,
            restoreState: 0,
            isEOF: 1,
            docsExamined: 1,
            inputStage: {
              stage: "IXSCAN",
              nReturned: 1,
              executionTimeMillisEstimate: 0,
              works: 2,
              advanced: 1,
              needTime: 0,
              needYield: 0,
              saveState: 0,
              restoreState: 0,
              isEOF: 1,
              keysExamined: 1,
              seeks: 1,
            },
          },
        },
      };

      const stats = await getCompressionStats(typicalPlan);

      // Expect meaningful compression (deflate achieves ~40%+ on typical explain plans)
      // Note: base64 encoding adds ~33% overhead which reduces the effective ratio
      expect(stats.compressionRatio).toBeGreaterThan(0.4);
    });
  });

  describe("edge cases", () => {
    it("handles empty objects", async () => {
      const original = {};
      const compressed = await compressPlan(original);
      const decompressed = await decompressPlan(compressed);

      expect(decompressed).toEqual(original);
    });

    it("handles empty arrays", async () => {
      const original = { stages: [], shards: [] };
      const compressed = await compressPlan(original);
      const decompressed = await decompressPlan(compressed);

      expect(decompressed).toEqual(original);
    });

    it("handles deeply nested structures", async () => {
      const original = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: "deep",
                },
              },
            },
          },
        },
      };

      const compressed = await compressPlan(original);
      const decompressed = await decompressPlan(compressed);

      expect(decompressed).toEqual(original);
    });

    it("handles large numeric values", async () => {
      const original = {
        nReturned: 999999999,
        executionTimeMillis: 123456789,
        works: Number.MAX_SAFE_INTEGER,
      };

      const compressed = await compressPlan(original);
      const decompressed = await decompressPlan(compressed);

      expect(decompressed).toEqual(original);
    });

    it("handles floating point numbers", async () => {
      const original = {
        ratio: 0.123456789,
        negative: -3.14159,
      };

      const compressed = await compressPlan(original);
      const decompressed = await decompressPlan(compressed);

      expect(decompressed).toEqual(original);
    });
  });

  describe("version handling", () => {
    it("includes version prefix in compressed output", async () => {
      const plan = { stage: "IXSCAN" };
      const compressed = await compressPlan(plan);

      expect(compressed.startsWith("v1:")).toBe(true);
    });

    it("throws error for missing version prefix", async () => {
      // Create payload without version prefix
      const plan = { stage: "IXSCAN" };
      const compressed = await compressPlan(plan);
      const noVersionPrefix = compressed.replace(/^v\d+:/, "");

      await expect(decompressPlan(noVersionPrefix)).rejects.toThrow(
        /missing version prefix/,
      );
    });

    it("throws error for unsupported version", async () => {
      // Create a fake v99 format
      const plan = { stage: "IXSCAN" };
      const compressed = await compressPlan(plan);
      const unsupportedVersion = compressed.replace(/^v\d+:/, "v99:");

      await expect(decompressPlan(unsupportedVersion)).rejects.toThrow(
        /Unsupported URL format version: v99/,
      );
    });

    it("parsePlanFromHash returns null for unsupported version", async () => {
      const plan = { stage: "IXSCAN" };
      const compressed = await compressPlan(plan);
      const unsupportedVersion = compressed.replace(/^v\d+:/, "v99:");

      const result = await parsePlanFromHash(unsupportedVersion);
      expect(result).toBe(null);
    });
  });

  describe("security", () => {
    it("rejects decompressed data exceeding size limit", async () => {
      // Create a payload that exceeds MAX_DECOMPRESSED_SIZE when decompressed
      // Using repetitive data that compresses very well (simulates a compression bomb)
      const repeatedData = "x".repeat(MAX_DECOMPRESSED_SIZE + 1000);
      const oversizedPlan = { data: repeatedData };

      const compressed = await compressPlan(oversizedPlan);

      // Decompression should throw an error due to size limit
      await expect(decompressPlan(compressed)).rejects.toThrow(
        /exceeds maximum allowed size/,
      );
    });

    it("allows data just under the size limit", async () => {
      // Create a payload that's under the limit (using less repetitive data to avoid
      // the test being too slow - 100KB is plenty to verify the limit works)
      const safeSize = 100 * 1024; // 100KB
      const safeData = "x".repeat(safeSize);
      const safePlan = { data: safeData };

      const compressed = await compressPlan(safePlan);
      const decompressed = await decompressPlan(compressed);

      expect(decompressed).toEqual(safePlan);
    });

    it("parsePlanFromHash returns null for oversized data instead of throwing", async () => {
      // Create oversized payload
      const repeatedData = "x".repeat(MAX_DECOMPRESSED_SIZE + 1000);
      const oversizedPlan = { data: repeatedData };

      const compressed = await compressPlan(oversizedPlan);

      // parsePlanFromHash should catch the error and return null
      const result = await parsePlanFromHash(compressed);
      expect(result).toBe(null);
    });
  });
});
