import { describe, it, expect } from "vitest";
import { semanticEqual, findDifference } from "./semanticEqual";

describe("semanticEqual", () => {
  describe("primitives", () => {
    it("compares numbers", () => {
      expect(semanticEqual(42, 42)).toBe(true);
      expect(semanticEqual(42, 43)).toBe(false);
      expect(semanticEqual(0, 0)).toBe(true);
    });

    it("compares strings", () => {
      expect(semanticEqual("foo", "foo")).toBe(true);
      expect(semanticEqual("foo", "bar")).toBe(false);
      expect(semanticEqual("", "")).toBe(true);
    });

    it("compares booleans", () => {
      expect(semanticEqual(true, true)).toBe(true);
      expect(semanticEqual(false, false)).toBe(true);
      expect(semanticEqual(true, false)).toBe(false);
    });

    it("handles different primitive types", () => {
      expect(semanticEqual(42, "42")).toBe(false);
      expect(semanticEqual(0, false)).toBe(false);
      expect(semanticEqual(1, true)).toBe(false);
    });
  });

  describe("null and undefined", () => {
    it("treats null and undefined as equivalent", () => {
      expect(semanticEqual(null, undefined)).toBe(true);
      expect(semanticEqual(undefined, null)).toBe(true);
      expect(semanticEqual(null, null)).toBe(true);
      expect(semanticEqual(undefined, undefined)).toBe(true);
    });

    it("distinguishes null/undefined from other values", () => {
      expect(semanticEqual(null, 0)).toBe(false);
      expect(semanticEqual(undefined, "")).toBe(false);
      expect(semanticEqual(null, false)).toBe(false);
    });
  });

  describe("Extended JSON numbers", () => {
    it("compares $numberInt with primitives", () => {
      expect(semanticEqual({ $numberInt: "42" }, 42)).toBe(true);
      expect(semanticEqual(42, { $numberInt: "42" })).toBe(true);
      expect(semanticEqual({ $numberInt: "42" }, 43)).toBe(false);
    });

    it("compares $numberLong with primitives", () => {
      expect(semanticEqual({ $numberLong: "12345" }, 12345)).toBe(true);
      expect(semanticEqual(12345, { $numberLong: "12345" })).toBe(true);
    });

    it("compares $numberDouble with primitives", () => {
      expect(semanticEqual({ $numberDouble: "3.14159" }, 3.14159)).toBe(true);
      expect(semanticEqual(3.14159, { $numberDouble: "3.14159" })).toBe(true);
    });

    it("handles Extended JSON objects with non-string values", () => {
      // Invalid Extended JSON, but should not crash
      expect(semanticEqual({ $numberInt: 42 }, 42)).toBe(false);
    });

    it("does not treat $timestamp as Extended JSON number", () => {
      const timestamp = { $timestamp: { t: 1234, i: 1 } };
      expect(semanticEqual(timestamp, 1234)).toBe(false);
      expect(semanticEqual(timestamp, timestamp)).toBe(true);
    });
  });

  describe("arrays", () => {
    it("compares arrays element-wise", () => {
      expect(semanticEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(semanticEqual([1, 2, 3], [1, 2, 4])).toBe(false);
      expect(semanticEqual([1, 2], [1, 2, 3])).toBe(false);
    });

    it("treats empty arrays as equivalent to undefined", () => {
      expect(semanticEqual([], undefined)).toBe(true);
      expect(semanticEqual(undefined, [])).toBe(true);
      expect(semanticEqual([], null)).toBe(true);
    });

    it("preserves array ordering", () => {
      expect(semanticEqual([1, 2, 3], [3, 2, 1])).toBe(false);
    });

    it("handles nested arrays", () => {
      expect(
        semanticEqual(
          [
            [1, 2],
            [3, 4],
          ],
          [
            [1, 2],
            [3, 4],
          ],
        ),
      ).toBe(true);
      expect(
        semanticEqual(
          [
            [1, 2],
            [3, 4],
          ],
          [
            [1, 2],
            [3, 5],
          ],
        ),
      ).toBe(false);
    });

    it("handles arrays with Extended JSON", () => {
      expect(
        semanticEqual([{ $numberInt: "42" }, { $numberInt: "43" }], [42, 43]),
      ).toBe(true);
    });
  });

  describe("objects", () => {
    it("compares simple objects", () => {
      expect(semanticEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(semanticEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
    });

    it("ignores field ordering", () => {
      expect(semanticEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
      expect(
        semanticEqual(
          { x: "foo", y: "bar", z: 42 },
          { z: 42, x: "foo", y: "bar" },
        ),
      ).toBe(true);
    });

    it("handles missing keys with null/undefined values", () => {
      expect(semanticEqual({ a: 1, b: null }, { a: 1 })).toBe(true);
      expect(semanticEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
      expect(semanticEqual({ a: 1 }, { a: 1, b: null })).toBe(true);
    });

    it("handles missing keys with empty array values", () => {
      expect(semanticEqual({ a: 1, b: [] }, { a: 1 })).toBe(true);
      expect(semanticEqual({ a: 1 }, { a: 1, b: [] })).toBe(true);
    });

    it("detects missing keys with non-empty values", () => {
      expect(semanticEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
      expect(semanticEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it("handles nested objects", () => {
      expect(
        semanticEqual({ a: { b: { c: 42 } } }, { a: { b: { c: 42 } } }),
      ).toBe(true);
      expect(
        semanticEqual({ a: { b: { c: 42 } } }, { a: { b: { c: 43 } } }),
      ).toBe(false);
    });

    it("handles complex MongoDB-like structures", () => {
      const a = {
        stage: "IXSCAN",
        indexName: "idx_1",
        keysExamined: { $numberInt: "100" },
        docsExamined: 50,
        inputStage: {
          stage: "FETCH",
          filter: { field: { $gt: 10 } },
        },
      };

      const b = {
        docsExamined: 50,
        stage: "IXSCAN",
        inputStage: {
          filter: { field: { $gt: 10 } },
          stage: "FETCH",
        },
        indexName: "idx_1",
        keysExamined: 100,
      };

      expect(semanticEqual(a, b)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles deeply nested structures", () => {
      const deep1 = { a: { b: { c: { d: { e: { f: 42 } } } } } };
      const deep2 = { a: { b: { c: { d: { e: { f: 42 } } } } } };
      const deep3 = { a: { b: { c: { d: { e: { f: 43 } } } } } };

      expect(semanticEqual(deep1, deep2)).toBe(true);
      expect(semanticEqual(deep1, deep3)).toBe(false);
    });

    it("handles mixed arrays and objects", () => {
      const obj1 = {
        stages: [
          { stage: "IXSCAN", keys: [1, 2, 3] },
          { stage: "FETCH", docs: [{ id: 1 }, { id: 2 }] },
        ],
      };

      const obj2 = {
        stages: [
          { keys: [1, 2, 3], stage: "IXSCAN" },
          { docs: [{ id: 1 }, { id: 2 }], stage: "FETCH" },
        ],
      };

      expect(semanticEqual(obj1, obj2)).toBe(true);
    });

    it("handles empty objects", () => {
      expect(semanticEqual({}, {})).toBe(true);
      expect(semanticEqual({}, { a: 1 })).toBe(false);
    });

    it("handles objects with only null/undefined values", () => {
      expect(semanticEqual({ a: null, b: undefined }, {})).toBe(true);
      expect(semanticEqual({}, { a: null, b: undefined })).toBe(true);
    });
  });
});

describe("findDifference", () => {
  it("returns null for equal values", () => {
    expect(findDifference(42, 42)).toBe(null);
    expect(findDifference({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(null);
  });

  it("identifies primitive differences", () => {
    const diff = findDifference(42, 43);
    expect(diff).toContain("42");
    expect(diff).toContain("43");
  });

  it("identifies missing keys", () => {
    const diff = findDifference({ a: 1, b: 2 }, { a: 1 });
    expect(diff).toContain("b");
    expect(diff).toContain("missing");
  });

  it("identifies nested differences", () => {
    const a = { stage: { inputStage: { keysExamined: 100 } } };
    const b = { stage: { inputStage: { keysExamined: 200 } } };
    const diff = findDifference(a, b);

    expect(diff).toContain("keysExamined");
    expect(diff).toContain("100");
    expect(diff).toContain("200");
  });

  it("provides path to difference", () => {
    const a = { a: { b: { c: 1 } } };
    const b = { a: { b: { c: 2 } } };
    const diff = findDifference(a, b);

    expect(diff).toContain("a.b.c");
  });

  it("identifies array length differences", () => {
    const diff = findDifference([1, 2, 3], [1, 2]);
    expect(diff).toContain("length");
  });

  it("identifies array element differences", () => {
    const diff = findDifference([1, 2, 3], [1, 99, 3]);
    expect(diff).toContain("[1]");
  });
});
