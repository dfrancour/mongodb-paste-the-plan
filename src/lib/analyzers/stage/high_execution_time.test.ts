import { describe, it, expect } from "vitest";
import { highExecutionTime } from "./high_execution_time";
import { createMockNormalizedStage } from "../test-helpers";
import type { StageInput } from "../types";

describe("highExecutionTime", () => {
  it("detects critically high execution time", () => {
    const input: StageInput = {
      stage: createMockNormalizedStage({
        metrics: { executionTimeMillis: 90 },
      }),
      totalExecutionTime: 100,
    };

    const findings = highExecutionTime.analyze(input);

    expect(findings.length).toBe(1);
    expect(findings[0]!.severity).toBe("critical");
    expect(findings[0]!.metadata?.percentageOfTotal).toBe(90);
  });

  it("detects warning-level execution time", () => {
    const input: StageInput = {
      stage: createMockNormalizedStage({
        metrics: { executionTimeMillis: 60 },
      }),
      totalExecutionTime: 100,
    };

    const findings = highExecutionTime.analyze(input);

    expect(findings.length).toBe(1);
    expect(findings[0]!.severity).toBe("warning");
  });

  it("skips small times", () => {
    const input: StageInput = {
      stage: createMockNormalizedStage({
        metrics: { executionTimeMillis: 5 },
      }),
      totalExecutionTime: 10,
    };

    const findings = highExecutionTime.analyze(input);
    expect(findings.length).toBe(0);
  });
});
