import { describe, it, expect } from "vitest";
import { overallEfficiency } from "./overall_efficiency";
import { createMockNormalizedStage } from "../test-helpers";
import type { PlanInput } from "../types";
import type { NormalizedStage } from "#types/explain-plan";

function createPlanInput(
  overrides: Partial<PlanInput> & { allStages?: NormalizedStage[] } = {},
): PlanInput {
  const rootStage =
    overrides.rootStage ??
    createMockNormalizedStage({ id: "root", stage: "ROOT" });
  return {
    explainPlan: overrides.explainPlan ?? ({} as PlanInput["explainPlan"]),
    rootStage,
    allStages: overrides.allStages ?? [rootStage],
    esrAnalysis: overrides.esrAnalysis,
  };
}

describe("overallEfficiency", () => {
  it("detects critically low document efficiency (< 1%)", () => {
    const root = createMockNormalizedStage({
      id: "root",
      metrics: { nReturned: 5, docsExamined: 10000 },
    });
    const input = createPlanInput({
      rootStage: root,
      allStages: [root],
      explainPlan: {
        executionStats: {
          totalDocsExamined: 10000,
          totalKeysExamined: 0,
          nReturned: 5,
        },
      } as PlanInput["explainPlan"],
    });

    const findings = overallEfficiency.analyze(input);

    const docFinding = findings.find(
      (f) => f.id === "overall-document-efficiency",
    );
    expect(docFinding).toBeDefined();
    expect(docFinding!.severity).toBe("critical");
    expect(docFinding!.metadata?.documentEfficiency).toBeCloseTo(0.0005);
  });

  it("detects warning-level document efficiency (1-10%)", () => {
    const root = createMockNormalizedStage({
      id: "root",
      metrics: { nReturned: 50, docsExamined: 1000 },
    });
    const input = createPlanInput({
      rootStage: root,
      allStages: [root],
      explainPlan: {
        executionStats: {
          totalDocsExamined: 1000,
          totalKeysExamined: 0,
          nReturned: 50,
        },
      } as PlanInput["explainPlan"],
    });

    const findings = overallEfficiency.analyze(input);

    const docFinding = findings.find(
      (f) => f.id === "overall-document-efficiency",
    );
    expect(docFinding).toBeDefined();
    expect(docFinding!.severity).toBe("warning");
  });

  it("detects excellent efficiency (>= 90%)", () => {
    const root = createMockNormalizedStage({
      id: "root",
      metrics: { nReturned: 95, docsExamined: 100 },
    });
    const input = createPlanInput({
      rootStage: root,
      allStages: [root],
      explainPlan: {
        executionStats: {
          totalDocsExamined: 100,
          totalKeysExamined: 0,
          nReturned: 95,
        },
      } as PlanInput["explainPlan"],
    });

    const findings = overallEfficiency.analyze(input);

    const excellentFinding = findings.find(
      (f) => f.id === "overall-excellent-efficiency",
    );
    expect(excellentFinding).toBeDefined();
    expect(excellentFinding!.severity).toBe("info");
    expect(excellentFinding!.category).toBe("optimization");
  });

  it("skips when below minimum docs examined threshold", () => {
    const root = createMockNormalizedStage({
      id: "root",
      metrics: { nReturned: 1, docsExamined: 50 },
    });
    const input = createPlanInput({
      rootStage: root,
      allStages: [root],
      explainPlan: {
        executionStats: {
          totalDocsExamined: 50, // Below 100 threshold
          totalKeysExamined: 0,
          nReturned: 1,
        },
      } as PlanInput["explainPlan"],
    });

    const findings = overallEfficiency.analyze(input);

    const docFinding = findings.find(
      (f) => f.id === "overall-document-efficiency",
    );
    expect(docFinding).toBeUndefined();
  });

  it("detects low work efficiency", () => {
    const stages = [
      createMockNormalizedStage({
        id: "root",
        metrics: { works: 1000, advanced: 100 }, // 10% efficiency
      }),
    ];
    const input = createPlanInput({
      rootStage: stages[0]!,
      allStages: stages,
    });

    const findings = overallEfficiency.analyze(input);

    const workFinding = findings.find(
      (f) => f.id === "overall-work-efficiency",
    );
    expect(workFinding).toBeDefined();
    expect(workFinding!.severity).toBe("warning");
    expect(workFinding!.metadata?.workEfficiency).toBeCloseTo(0.1);
  });

  it("detects high key examination", () => {
    const root = createMockNormalizedStage({
      id: "root",
      metrics: { keysExamined: 100000, docsExamined: 100, nReturned: 5 },
    });
    const input = createPlanInput({
      rootStage: root,
      allStages: [root],
      explainPlan: {
        executionStats: {
          totalDocsExamined: 100,
          totalKeysExamined: 100000, // 10x docs, indexEfficiency = 0.00005
          nReturned: 5,
        },
      } as PlanInput["explainPlan"],
    });

    const findings = overallEfficiency.analyze(input);

    const keyFinding = findings.find(
      (f) => f.id === "overall-index-efficiency",
    );
    expect(keyFinding).toBeDefined();
    expect(keyFinding!.severity).toBe("info");
    expect(keyFinding!.category).toBe("indexUsage");
  });
});
