import { describe, it, expect } from "vitest";
import { lowDocumentEfficiency } from "./low_document_efficiency";
import { createMockNormalizedStage } from "../test-helpers";
import type { StageInput } from "../types";

describe("lowDocumentEfficiency", () => {
  it("detects critically low document efficiency", () => {
    const input: StageInput = {
      stage: createMockNormalizedStage({
        metrics: {
          docsExamined: 10000,
          nReturned: 10, // 0.1% document efficiency
        },
      }),
    };

    const findings = lowDocumentEfficiency.analyze(input);

    expect(findings.length).toBe(1);
    expect(findings[0]!.severity).toBe("critical");
    expect(findings[0]!.metadata?.documentEfficiency).toBeCloseTo(0.001);
  });

  it("detects warning-level low document efficiency", () => {
    const input: StageInput = {
      stage: createMockNormalizedStage({
        metrics: {
          docsExamined: 1000,
          nReturned: 50, // 5% document efficiency
        },
      }),
    };

    const findings = lowDocumentEfficiency.analyze(input);

    expect(findings.length).toBe(1);
    expect(findings[0]!.severity).toBe("warning");
  });

  it("does not flag good document efficiency", () => {
    const input: StageInput = {
      stage: createMockNormalizedStage({
        metrics: {
          docsExamined: 1000,
          nReturned: 500, // 50% document efficiency
        },
      }),
    };

    const findings = lowDocumentEfficiency.analyze(input);
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

    const findings = lowDocumentEfficiency.analyze(input);
    expect(findings.length).toBe(0);
  });
});
