import { describe, it, expect } from "vitest";
import { collapsePlanSummary, parsePlanSummary } from "./planSummary";

describe("parsePlanSummary", () => {
  it("parses a bare stage", () => {
    expect(parsePlanSummary("COLLSCAN")).toEqual([{ stage: "COLLSCAN" }]);
  });

  it("parses stages with key patterns", () => {
    expect(
      parsePlanSummary(
        "IXSCAN { status: 1, region: 1 }, IXSCAN { status: 1, region: 1 }",
      ),
    ).toEqual([
      { stage: "IXSCAN", keyPattern: "{ status: 1, region: 1 }" },
      { stage: "IXSCAN", keyPattern: "{ status: 1, region: 1 }" },
    ]);
  });

  it("keeps nested braces and dotted keys intact", () => {
    expect(parsePlanSummary('IXSCAN { "a.b": 1, c: { d: 1 } }')).toEqual([
      { stage: "IXSCAN", keyPattern: '{ "a.b": 1, c: { d: 1 } }' },
    ]);
  });

  it("keeps digits in stage names", () => {
    expect(parsePlanSummary('GEO_NEAR_2DSPHERE { loc: "2dsphere" }')).toEqual([
      { stage: "GEO_NEAR_2DSPHERE", keyPattern: '{ loc: "2dsphere" }' },
    ]);
  });

  it("parses mixed stage lists", () => {
    expect(
      parsePlanSummary("IXSCAN { a: 1 }, COLLSCAN").map((s) => s.stage),
    ).toEqual(["IXSCAN", "COLLSCAN"]);
  });
});

describe("collapsePlanSummary", () => {
  it("collapses repeated identical stages", () => {
    expect(
      collapsePlanSummary("IXSCAN { a: 1 }, IXSCAN { a: 1 }, IXSCAN { a: 1 }"),
    ).toBe("3× IXSCAN { a: 1 }");
  });

  it("leaves distinct stages alone", () => {
    expect(collapsePlanSummary("IXSCAN { a: 1 }, COLLSCAN")).toBe(
      "IXSCAN { a: 1 }, COLLSCAN",
    );
  });

  it("counts each distinct stage in first-seen order", () => {
    expect(
      collapsePlanSummary(
        "IXSCAN { a: 1 }, COLLSCAN, IXSCAN { a: 1 }, IXSCAN { b: 1 }",
      ),
    ).toBe("2× IXSCAN { a: 1 }, COLLSCAN, IXSCAN { b: 1 }");
  });
});
