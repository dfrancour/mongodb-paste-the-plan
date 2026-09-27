import { describe, it, expect } from "vitest";
import { shellLiteral } from "./shellLiteral";

describe("shellLiteral", () => {
  it("renders extended JSON wrappers as shell constructors", () => {
    expect(shellLiteral({ $oid: "5f1d7f3e2c4b1a0001234567" })).toBe(
      'ObjectId("5f1d7f3e2c4b1a0001234567")',
    );
    expect(shellLiteral({ $date: "2026-01-01T00:00:00.000Z" })).toBe(
      'ISODate("2026-01-01T00:00:00.000Z")',
    );
    expect(shellLiteral({ $date: { $numberLong: "1700000000000" } })).toBe(
      "new Date(1700000000000)",
    );
    expect(shellLiteral({ $numberLong: "42" })).toBe('NumberLong("42")');
    expect(
      shellLiteral({ $regularExpression: { pattern: "^a/b", options: "i" } }),
    ).toBe("/^a\\/b/i");
    expect(shellLiteral({ $timestamp: { t: 1, i: 2 } })).toBe(
      "Timestamp(1, 2)",
    );
  });

  it("leaves plain values and quotes only awkward keys", () => {
    expect(shellLiteral({ a: 1, "b.c": "x", $in: [1, "2"] })).toBe(
      '{\n  a: 1,\n  "b.c": "x",\n  $in: [\n    1,\n    "2"\n  ]\n}',
    );
    expect(shellLiteral([])).toBe("[]");
    expect(shellLiteral({})).toBe("{}");
    expect(shellLiteral(null)).toBe("null");
  });
});
