import { describe, it, expect } from "vitest";
import { glossaryHrefForStage } from "./planSummaryLinks";

describe("glossaryHrefForStage", () => {
  it("links plan-summary stages that the glossary documents", () => {
    for (const stage of [
      "COLLSCAN",
      "IXSCAN",
      "IDHACK",
      "COUNT_SCAN",
      "DISTINCT_SCAN",
    ]) {
      expect(glossaryHrefForStage(stage), stage).toMatch(
        /^\/mongodb-stage-glossary#/,
      );
    }
  });

  it("returns nothing for unknown tokens", () => {
    expect(glossaryHrefForStage("NOT_A_STAGE")).toBeUndefined();
  });
});
