import { describe, it, expect } from "vitest";
import { extractMetrics } from "./metricsExtractor";
import type { ExplainStage } from "#types/explain-plan";
import type { ExecutionStage, StageDefinition } from "#data/stages/types";
import { StageIds, StageCategory } from "#data/stages/types";
import { SPILLING_FIELDS } from "#data/stages/fields/spilling";

function makeDefinition(
  overrides: Partial<ExecutionStage> = {},
): ExecutionStage {
  return {
    layer: "execution",
    engine: "classic",
    id: StageIds.execution("TEST"),
    fullName: "Test",
    description: "Test",
    category: StageCategory.Internal,
    iconName: "CircleQuestionMark",
    blockingStage: false,
    canSpillToDisk: false,
    ...overrides,
  } as ExecutionStage;
}

describe("extractMetrics with field declarations", () => {
  it("extracts typed fields without a definition", () => {
    const stage = {
      stage: "TEST",
      nReturned: 10,
      keysExamined: 20,
    } as unknown as ExplainStage;
    const result = extractMetrics(stage);
    expect(result.nReturned).toBe(10);
    expect(result.keysExamined).toBe(20);
  });

  it("extracts stage-specific fields from explainFields declarations", () => {
    const stage = {
      stage: "IXSCAN",
      nReturned: 100,
      keysExamined: 200,
      numReads: 50,
    } as unknown as ExplainStage;
    const def = makeDefinition({
      explainFields: [
        {
          bsonKey: "numReads",
          description: "Number of reads",
          valueType: "number",
          verbosity: "executionStats",
          unit: "count",
        },
      ],
    });
    const result = extractMetrics(stage, def);
    expect(result.nReturned).toBe(100);
    expect(result.numReads).toBe(50);
  });

  it("does not duplicate typed fields from declarations", () => {
    const stage = {
      stage: "IXSCAN",
      nReturned: 100,
      keysExamined: 200,
      seeks: 10,
    } as unknown as ExplainStage;
    const def = makeDefinition({
      explainFields: [
        {
          bsonKey: "keysExamined",
          description: "Keys examined",
          valueType: "number",
          verbosity: "executionStats",
          unit: "count",
        },
        {
          bsonKey: "seeks",
          description: "Seeks",
          valueType: "number",
          verbosity: "executionStats",
          unit: "count",
        },
      ],
    });
    const result = extractMetrics(stage, def);
    // keysExamined and seeks come from the typed extraction, not duplicated
    expect(result.keysExamined).toBe(200);
    expect(result.seeks).toBe(10);
  });

  it("extracts spilling fields from spill-capable stages", () => {
    const stage = {
      stage: "SORT",
      usedDisk: true,
      spills: 3,
      spilledRecords: 1000,
      spilledBytes: 50000,
      spilledDataStorageSize: 25000,
      nReturned: 100,
    } as unknown as ExplainStage;
    const def = makeDefinition({
      canSpillToDisk: true,
      explainFields: [...SPILLING_FIELDS],
    });
    const result = extractMetrics(stage, def);
    // usedDisk is a typed field
    expect(result.usedDisk).toBe(true);
    // Spilling fields from declarations
    expect(result.spills).toBe(3);
    expect(result.spilledRecords).toBe(1000);
    expect(result.spilledBytes).toBe(50000);
    expect(result.spilledDataStorageSize).toBe(25000);
  });

  it("ignores declaration fields missing from stage", () => {
    const stage = {
      stage: "IXSCAN",
      nReturned: 100,
    } as unknown as ExplainStage;
    const def = makeDefinition({
      explainFields: [
        {
          bsonKey: "numReads",
          description: "Number of reads",
          valueType: "number",
          verbosity: "executionStats",
          unit: "count",
        },
      ],
    });
    const result = extractMetrics(stage, def);
    expect(result.numReads).toBeUndefined();
  });

  it("excludes queryPlanner-verbosity fields", () => {
    const stage = {
      stage: "IXSCAN",
      keyPattern: { a: 1 },
      numReads: 50,
    } as unknown as ExplainStage;
    const def = makeDefinition({
      explainFields: [
        {
          bsonKey: "keyPattern",
          description: "Key pattern",
          valueType: "object",
          verbosity: "queryPlanner",
        },
        {
          bsonKey: "numReads",
          description: "Number of reads",
          valueType: "number",
          verbosity: "executionStats",
          unit: "count",
        },
      ],
    });
    const result = extractMetrics(stage, def);
    expect(result.numReads).toBe(50);
    expect(result.keyPattern).toBeUndefined();
  });

  it("extracts boolean values from declarations", () => {
    const stage = {
      stage: "TEST",
      someFlag: true,
    } as unknown as ExplainStage;
    const def = makeDefinition({
      explainFields: [
        {
          bsonKey: "someFlag",
          description: "Some flag",
          valueType: "boolean",
          verbosity: "executionStats",
        },
      ],
    });
    const result = extractMetrics(stage, def);
    expect(result.someFlag).toBe(true);
  });

  it("ignores non-execution definitions", () => {
    const stage = {
      stage: "TEST",
      numReads: 50,
    } as unknown as ExplainStage;
    const def = { layer: "pipeline" } as unknown as StageDefinition;
    const result = extractMetrics(stage, def);
    expect(result.numReads).toBeUndefined();
  });
});
