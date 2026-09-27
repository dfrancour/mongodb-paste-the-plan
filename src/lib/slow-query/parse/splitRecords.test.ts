import { describe, it, expect } from "vitest";
import { splitRecords } from "./splitRecords";
import { SlowQueryParseError } from "../errors";

describe("splitRecords", () => {
  it("reads JSON Lines and reports invalid lines by number", () => {
    const text = '{"a":1}\nnot json\n\n{"a":2}\r\n{"a":3}\n';
    const result = splitRecords(text);
    expect(result.records).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }]);
    expect(result.invalidLines).toEqual([2]);
  });

  it("reads a JSON array", () => {
    expect(splitRecords('[{"a":1},{"a":2}]').records).toHaveLength(2);
  });

  it("reads a single object", () => {
    expect(splitRecords('{"a":1}').records).toEqual([{ a: 1 }]);
  });

  it("strips a byte-order mark", () => {
    expect(splitRecords('﻿{"a":1}').records).toEqual([{ a: 1 }]);
  });

  it("returns nothing for blank input", () => {
    expect(splitRecords("  \n ").records).toEqual([]);
  });

  it("throws when no line is JSON at all", () => {
    expect(() => splitRecords("plain text\nmore text")).toThrow(
      SlowQueryParseError,
    );
  });
});
