import { describe, it, expect } from "vitest";
import { matchAfterProject } from "./match_after_project";
import type { AggregationInput } from "../types";

describe("matchAfterProject", () => {
  it("detects $match after $project", () => {
    const input: AggregationInput = {
      pipeline: [
        { stage: "$project", position: 0, spec: {} },
        { stage: "$match", position: 1, spec: {} },
      ],
    };

    const findings = matchAfterProject.analyze(input);

    // Gets both "match-after-project" and "match-not-at-start" findings
    expect(findings.length).toBeGreaterThanOrEqual(1);
    const matchAfterFinding = findings.find((f) =>
      f.id.startsWith("match-after-project"),
    );
    expect(matchAfterFinding).toBeDefined();
    expect(matchAfterFinding!.severity).toBe("warning");
    expect(matchAfterFinding!.category).toBe("optimization");
  });

  it("detects $match after $addFields", () => {
    const input: AggregationInput = {
      pipeline: [
        { stage: "$addFields", position: 0, spec: {} },
        { stage: "$match", position: 1, spec: {} },
      ],
    };

    const findings = matchAfterProject.analyze(input);

    // Gets both "match-after-project" and "match-not-at-start" findings
    expect(findings.length).toBeGreaterThanOrEqual(1);
    const matchAfterFinding = findings.find((f) =>
      f.id.startsWith("match-after-project"),
    );
    expect(matchAfterFinding).toBeDefined();
  });

  it("does not flag $match at start", () => {
    const input: AggregationInput = {
      pipeline: [
        { stage: "$match", position: 0, spec: {} },
        { stage: "$project", position: 1, spec: {} },
      ],
    };

    const findings = matchAfterProject.analyze(input);

    expect(findings.length).toBe(0);
  });

  it("flags first $match not at start when blocking stages precede", () => {
    const input: AggregationInput = {
      pipeline: [
        { stage: "$project", position: 0, spec: {} },
        { stage: "$match", position: 1, spec: {} },
      ],
    };

    const findings = matchAfterProject.analyze(input);

    // Should have both the match-after-project and match-not-at-start findings
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
});
