import { describe, it, expect } from "vitest";
import { lowSelectivity } from "./low_selectivity";
import { createMockNormalizedStage } from "../test-helpers";
import type { StageInput } from "../types";

describe("lowSelectivity", () => {
  it("detects critically low selectivity", () => {
    const input: StageInput = {
      stage: createMockNormalizedStage({
        metrics: {
          docsExamined: 10000,
          nReturned: 10, // 0.1% selectivity
        },
      }),
    };

    const findings = lowSelectivity.analyze(input);

    expect(findings.length).toBe(1);
    expect(findings[0]!.severity).toBe("critical");
    expect(findings[0]!.metadata?.selectivity).toBeCloseTo(0.001);
  });

  it("detects warning-level low selectivity", () => {
    const input: StageInput = {
      stage: createMockNormalizedStage({
        metrics: {
          docsExamined: 1000,
          nReturned: 50, // 5% selectivity
        },
      }),
    };

    const findings = lowSelectivity.analyze(input);

    expect(findings.length).toBe(1);
    expect(findings[0]!.severity).toBe("warning");
  });

  it("does not flag good selectivity", () => {
    const input: StageInput = {
      stage: createMockNormalizedStage({
        metrics: {
          docsExamined: 1000,
          nReturned: 500, // 50% selectivity
        },
      }),
    };

    const findings = lowSelectivity.analyze(input);
    expect(findings.length).toBe(0);
  });

  it("skips small document counts", () => {
    const input: StageInput = {
      stage: createMockNormalizedStage({
        metrics: {
          docsExamined: 50, // Below threshold
          nReturned: 1,
        },
      }),
    };

    const findings = lowSelectivity.analyze(input);
    expect(findings.length).toBe(0);
  });
});
