import { describe, it, expect } from "vitest";
import { inefficientFetch } from "./inefficient_fetch";
import { createMockNormalizedStage } from "../test-helpers";
import type { StageInput } from "../types";
import { StageCategory } from "#data/stages/types";

describe("inefficientFetch", () => {
  it("detects critically inefficient fetch (< 10% efficiency)", () => {
    const input: StageInput = {
      stage: createMockNormalizedStage({
        id: "fetch-1",
        stage: "FETCH",
        category: StageCategory.Fetch,
        metrics: {
          docsExamined: 1000,
          nReturned: 5, // 0.5% efficiency
        },
      }),
    };

    const findings = inefficientFetch.analyze(input);

    expect(findings.length).toBe(1);
    expect(findings[0]!.severity).toBe("critical");
    expect(findings[0]!.metricKey).toBe("efficiency");
    expect(findings[0]!.metadata?.efficiencyRatio).toBeCloseTo(0.005);
  });

  it("detects warning-level inefficient fetch (10-50% efficiency)", () => {
    const input: StageInput = {
      stage: createMockNormalizedStage({
        stage: "FETCH",
        category: StageCategory.Fetch,
        metrics: {
          docsExamined: 100,
          nReturned: 30, // 30% efficiency
        },
      }),
    };

    const findings = inefficientFetch.analyze(input);

    expect(findings.length).toBe(1);
    expect(findings[0]!.severity).toBe("warning");
  });

  it("does not flag efficient fetch (>= 50%)", () => {
    const input: StageInput = {
      stage: createMockNormalizedStage({
        stage: "FETCH",
        category: StageCategory.Fetch,
        metrics: {
          docsExamined: 100,
          nReturned: 80,
        },
      }),
    };

    const findings = inefficientFetch.analyze(input);
    expect(findings.length).toBe(0);
  });

  it("skips small document counts (< 10)", () => {
    const input: StageInput = {
      stage: createMockNormalizedStage({
        stage: "FETCH",
        category: StageCategory.Fetch,
        metrics: {
          docsExamined: 5,
          nReturned: 1,
        },
      }),
    };

    const findings = inefficientFetch.analyze(input);
    expect(findings.length).toBe(0);
  });

  it("skips non-fetch stages", () => {
    const input: StageInput = {
      stage: createMockNormalizedStage({
        stage: "IXSCAN",
        category: StageCategory.IndexScan,
        metrics: {
          docsExamined: 10000,
          nReturned: 1,
        },
      }),
    };

    const findings = inefficientFetch.analyze(input);
    expect(findings.length).toBe(0);
  });

  it("skips when metrics are missing", () => {
    const input: StageInput = {
      stage: createMockNormalizedStage({
        stage: "FETCH",
        category: StageCategory.Fetch,
        metrics: { docsExamined: 100 }, // nReturned missing
      }),
    };

    const findings = inefficientFetch.analyze(input);
    expect(findings.length).toBe(0);
  });
});
