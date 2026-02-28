import { describe, it, expect } from "vitest";
import { sanitizeJsonText, parseExplainPlanText } from "./sanitizeJson";

describe("sanitizeJsonText", () => {
  it("replaces Infinity with null", () => {
    const input = '{ "endKey": { "year": Infinity } }';
    const result = sanitizeJsonText(input);
    expect(JSON.parse(result)).toEqual({ endKey: { year: null } });
  });

  it("replaces -Infinity with null", () => {
    const input = '{ "startKey": { "year": -Infinity } }';
    const result = sanitizeJsonText(input);
    expect(JSON.parse(result)).toEqual({ startKey: { year: null } });
  });

  it("replaces NaN with null", () => {
    const input = '{ "value": NaN }';
    const result = sanitizeJsonText(input);
    expect(JSON.parse(result)).toEqual({ value: null });
  });

  it("handles multiple occurrences", () => {
    const input = '{ "a": Infinity, "b": -Infinity, "c": NaN }';
    const result = sanitizeJsonText(input);
    expect(JSON.parse(result)).toEqual({ a: null, b: null, c: null });
  });

  it("does not modify standard JSON", () => {
    const input = '{ "name": "Infinity Road", "count": 42 }';
    expect(sanitizeJsonText(input)).toBe(input);
  });

  it("does not replace Infinity inside string values", () => {
    const input = '{ "description": "Infinity and beyond" }';
    expect(sanitizeJsonText(input)).toBe(input);
  });
});

describe("parseExplainPlanText", () => {
  it("parses standard JSON", () => {
    const result = parseExplainPlanText('{ "count": 42 }');
    expect(result).toEqual({ count: 42 });
  });

  it("handles Infinity in MongoDB index bounds", () => {
    const input = '{ "endKey": { "year": Infinity } }';
    const result = parseExplainPlanText(input);
    expect(result).toEqual({ endKey: { year: null } });
  });

  it("throws on truly invalid JSON", () => {
    expect(() => parseExplainPlanText("not json at all")).toThrow();
  });
});
