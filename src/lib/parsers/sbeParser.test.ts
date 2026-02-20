import { describe, expect, test } from "vitest";
import { SBEParser } from "./sbeParser";
import type { SlotBasedPlan } from "#types/explain-plan";

describe("SBE Parser", () => {
  const exampleSBEPlan: SlotBasedPlan = {
    slots:
      "$$RESULT=s17 env: { s3 = Timestamp(1692938942, 6) (CLUSTER_TIME), s1 = TimeZoneDatabase(GB-Eire...Atlantic/Madeira) (timeZoneDB), s4 = 1692938942311 (NOW), s2 = Nothing (SEARCH_META) }",
    stages:
      '[3] mkobj s17 [_id = s12, total = s16] true false \n[3] project [s16 = doubleDoubleSumFinalize (s14)] \n[3] group [s12] [s14 = aggDoubleDoubleSum (s13)] spillSlots[s15] mergingExprs[aggMergeDoubleDoubleSums (s15)] \n[3] project [s13 = getField (s10, "transaction_count")] \n[3] project [s12 = fillEmpty (s11, null)] \n[3] project [s11 = getField (s10, "account_id")] \n[2] mkbson s10 [transaction_count = s5, account_id = s6] true false \n[1] nlj [] [s8, s9] \n\tleft \n\t\t[1] project [s8 = KS(2B060A0104), s9 = KS(2B06F0FE04)] \n\t\t[1] limit 1 \n\t\t[1] coscan \n\tright \n\t\t[1] ixseek s8 s9 none s7 none none [s5 = 0, s6 = 1] @"022f56f5-fb07-403f-b982-824f030d896c" @"transaction_count_1_account_id_1" true \n',
  };

  test("should parse SBE plan successfully", () => {
    const parsed = SBEParser.parseSBEPlan(exampleSBEPlan);

    expect(parsed.explainVersion).toBe("2");
    expect(parsed.slotEnvironment.resultSlot).toBe("s17");
    expect(parsed.stages.length).toBeGreaterThan(0);
    expect(parsed.originalSlotString).toBe(exampleSBEPlan.slots);
    expect(parsed.originalStagesString).toBe(exampleSBEPlan.stages);
  });

  test("should parse slot environment correctly", () => {
    const parsed = SBEParser.parseSBEPlan(exampleSBEPlan);
    const slots = parsed.slotEnvironment.slots;

    expect(slots.s3).toBeDefined();
    expect(slots.s3?.description).toBe("CLUSTER_TIME");
    expect(slots.s1?.description).toBe("timeZoneDB");
    expect(slots.s4?.description).toBe("NOW");
    expect(slots.s2?.description).toBe("SEARCH_META");
  });

  test("should parse stages hierarchy correctly", () => {
    const parsed = SBEParser.parseSBEPlan(exampleSBEPlan);
    const stages = parsed.stages;

    // Should have at least one root stage
    expect(stages.length).toBeGreaterThan(0);

    // Check for expected stage types
    const allStages = flattenStages(stages);
    const stageTypes = allStages.map((s) => s.stageType);

    expect(stageTypes).toContain("mkobj");
    expect(stageTypes).toContain("project");
    expect(stageTypes).toContain("group");
    expect(stageTypes).toContain("mkbson");
    expect(stageTypes).toContain("nlj");
    expect(stageTypes).toContain("ixseek");
  });

  test("should build slot lineages", () => {
    const parsed = SBEParser.parseSBEPlan(exampleSBEPlan);

    // Should have slot lineages
    expect(parsed.slotLineages.length).toBeGreaterThan(0);

    // Should have lineages for key slots
    const slotIds = parsed.slotLineages.map((l) => l.slotId);
    expect(slotIds).toContain("s17"); // Result slot
  });

  test("should calculate stage metrics", () => {
    const parsed = SBEParser.parseSBEPlan(exampleSBEPlan);

    expect(parsed.stageMetrics.length).toBeGreaterThan(0);

    // Each stage should have metrics
    for (const metric of parsed.stageMetrics) {
      expect(metric.stageId).toBeDefined();
      expect(metric.stageType).toBeDefined();
      expect(metric.nodeId).toBeGreaterThan(0);
      expect(metric.complexity).toMatch(
        /^(simple|moderate|complex|very_complex)$/,
      );
    }
  });

  test("should infer field meanings from getField operations", () => {
    const parsed = SBEParser.parseSBEPlan(exampleSBEPlan);

    // Look for lineages with inferred field meanings
    const fieldLineages = parsed.slotLineages.filter(
      (l) =>
        l.inferredMeaning.includes("transaction_count") ||
        l.inferredMeaning.includes("account_id"),
    );

    expect(fieldLineages.length).toBeGreaterThan(0);
  });
});

// Helper function to flatten nested stages
function flattenStages(
  stages: Array<{ stageType: string; children?: unknown[] }>,
): Array<{ stageType: string; children?: unknown[] }> {
  const flattened: Array<{ stageType: string; children?: unknown[] }> = [];

  for (const stage of stages) {
    flattened.push(stage);
    if (
      stage.children &&
      Array.isArray(stage.children) &&
      stage.children.length > 0
    ) {
      flattened.push(
        ...flattenStages(
          stage.children as Array<{ stageType: string; children?: unknown[] }>,
        ),
      );
    }
  }

  return flattened;
}
