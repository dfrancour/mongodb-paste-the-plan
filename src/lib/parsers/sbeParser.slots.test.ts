import { describe, it, expect } from "vitest";
import { SBEParser } from "./sbeParser";

describe("SBE Slot Parsing Accuracy", () => {
  it("should correctly parse slot semantics from real SBE plan", () => {
    // Real SBE plan from sort-without-index.executionStats.json
    const stagesString = `[3] sort [s11] [asc] [s8] 
[3] project [s11 = getSortKeyAsc(s10)] 
[2] nlj inner [] [s3, s4, s5, s6, s7] 
    left 
        [1] cfilter {(exists(s1) && exists(s2))} 
        [1] ixseek s1 s2 s6 s3 s4 s5 [] @"3309fad1-79d9-4193-a51b-a46b969a6870" @"accommodates_1" true 
    right 
        [2] limit 1ll 
        [2] seek s3 s8 s9 s4 s5 s6 s7 none none [s10 = summary] @"3309fad1-79d9-4193-a51b-a46b969a6870" true false`;

    const stages = SBEParser.parseStages(stagesString);

    // Find specific stages to test
    const projectStage = stages.find((s) => s.stageType === "project");
    const ixseekStage = stages.find((s) => s.stageType === "ixseek");
    const seekStage = stages.find((s) => s.stageType === "seek");
    const sortStage = stages.find((s) => s.stageType === "sort");
    const cfilterStage = stages.find((s) => s.stageType === "cfilter");
    const nljStage = stages.find((s) => s.stageType === "nlj");

    expect(projectStage).toBeDefined();
    expect(ixseekStage).toBeDefined();
    expect(seekStage).toBeDefined();
    expect(sortStage).toBeDefined();
    expect(cfilterStage).toBeDefined();
    expect(nljStage).toBeDefined();

    // Test project stage: [s11 = getSortKeyAsc(s10)]
    const projectMetrics = SBEParser.calculateStageMetrics([projectStage!])[0];
    expect(projectMetrics?.slotsConsumed).toEqual(["s10"]); // Consumes s10 in function
    expect(projectMetrics?.slotsProduced).toEqual(["s11"]); // Produces s11

    // Test ixseek stage: s1 s2 s6 s3 s4 s5 []
    const ixseekMetrics = SBEParser.calculateStageMetrics([ixseekStage!])[0];
    expect(ixseekMetrics?.slotsConsumed).toEqual(["s1", "s2"]); // Seek bounds
    expect(ixseekMetrics?.slotsProduced).toEqual(["s6", "s3", "s4", "s5"]); // Output slots

    // Test seek stage: s3 s8 s9 s4 s5 s6 s7 none none [s10 = summary]
    const seekMetrics = SBEParser.calculateStageMetrics([seekStage!])[0];
    expect(seekMetrics?.slotsConsumed).toEqual(["s3"]); // RecordId input
    expect(seekMetrics?.slotsProduced).toContain("s8"); // Record output
    expect(seekMetrics?.slotsProduced).toContain("s9"); // RecordId output
    expect(seekMetrics?.slotsProduced).toContain("s10"); // Projected field

    // Test sort stage: [s11] [asc] [s8]
    const sortMetrics = SBEParser.calculateStageMetrics([sortStage!])[0];
    expect(sortMetrics?.slotsConsumed).toEqual(["s11", "s8"]); // Sort keys and values
    expect(sortMetrics?.slotsProduced).toEqual(["s8"]); // Sorted values

    // Test cfilter stage: {(exists(s1) && exists(s2))}
    const cfilterMetrics = SBEParser.calculateStageMetrics([cfilterStage!])[0];
    expect(cfilterMetrics?.slotsConsumed).toEqual(["s1", "s2"]); // Filter references
    expect(cfilterMetrics?.slotsProduced).toEqual([]); // Filters don't produce

    // Test nlj stage: inner [] [s3, s4, s5, s6, s7]
    const nljMetrics = SBEParser.calculateStageMetrics([nljStage!])[0];
    expect(nljMetrics?.slotsConsumed).toEqual([]); // No correlation slots in this case
    expect(nljMetrics?.slotsProduced).toEqual(["s3", "s4", "s5", "s6", "s7"]); // Output slots
  });

  it("should handle complex aggregation stage patterns", () => {
    // Test group stage from complex aggregation
    const groupStageString =
      "[4] group [s34] [s35 = count(), s36 = addToSetCapped(s25, 104857600), s37 = addToSetCapped(s30, 104857600)]";
    const stages = SBEParser.parseStages(groupStageString);
    const groupStage = stages[0];

    expect(groupStage?.stageType).toBe("group");

    const groupMetrics = SBEParser.calculateStageMetrics([groupStage!])[0];
    expect(groupMetrics?.slotsConsumed).toEqual(["s34", "s25", "s30"]); // Group key + agg inputs
    expect(groupMetrics?.slotsProduced).toEqual(["s35", "s36", "s37"]); // Aggregation outputs
  });

  it("should handle mkobj stage patterns", () => {
    // Test mkobj stage
    const mkobjStageString = "[3] mkobj s17 [_id = s12, total = s16]";
    const stages = SBEParser.parseStages(mkobjStageString);
    const mkobjStage = stages[0];

    expect(mkobjStage?.stageType).toBe("mkobj");

    const mkobjMetrics = SBEParser.calculateStageMetrics([mkobjStage!])[0];
    expect(mkobjMetrics?.slotsConsumed).toEqual(["s12", "s16"]); // Field values
    expect(mkobjMetrics?.slotsProduced).toEqual(["s17"]); // Output object
  });

  it("should handle edge cases and fallbacks gracefully", () => {
    // Test unknown stage type
    const unknownStageString =
      "[1] mysterious_stage s1 s2 [s3 = computation(s4)]";
    const stages = SBEParser.parseStages(unknownStageString);
    const unknownStage = stages[0];

    expect(unknownStage?.stageType).toBe("mysterious_stage");

    const unknownMetrics = SBEParser.calculateStageMetrics([unknownStage!])[0];
    // Fallback should find function arguments and assignments
    expect(unknownMetrics?.slotsConsumed).toEqual(["s4"]); // From function argument
    expect(unknownMetrics?.slotsProduced).toEqual(["s3"]); // From assignment
  });
});
