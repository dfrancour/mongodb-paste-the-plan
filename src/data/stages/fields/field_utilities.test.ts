import { describe, it, expect } from "vitest";
import {
  hasExplainFields,
  getFieldsForStage,
  getFieldsAtVerbosity,
  getRenamedFields,
} from "./field_utilities";
import { CLASSIC_COMMON_FIELDS, SBE_COMMON_FIELDS } from "./common";
import { SPILLING_FIELDS } from "./spilling";
import { CBR_FIELDS } from "./cbr";
import type {
  ExecutionStage,
  PlanningStage,
  ExplainFieldDeclaration,
} from "../types";
import {
  StageIds,
  StageCategory,
  QuerySolutionStageType,
  isExecutionStage,
} from "../types";
import { getAllStages } from "../stage_utilities";

function makeStage(overrides: Partial<ExecutionStage> = {}): ExecutionStage {
  return {
    layer: "execution",
    engine: "classic",
    id: StageIds.execution("TEST"),
    fullName: "Test Stage",
    description: "A test stage",
    category: StageCategory.Internal,
    iconName: "CircleQuestionMark",
    blockingStage: false,
    canSpillToDisk: false,
    explainFields: [],
    ...overrides,
  } as ExecutionStage;
}

function makePlanningStage(
  overrides: Partial<PlanningStage> = {},
): PlanningStage {
  return {
    layer: "planning",
    id: StageIds.planning("TEST"),
    querySolutionStageType: QuerySolutionStageType.STAGE_IXSCAN,
    fullName: "Test Planning Stage",
    description: "A test planning stage",
    category: StageCategory.Internal,
    iconName: "CircleQuestionMark",
    blockingStage: false,
    canSpillToDisk: false,
    explainFields: [],
    ...overrides,
  } as PlanningStage;
}

describe("hasExplainFields", () => {
  it("returns true for execution stages", () => {
    const stage = makeStage();
    expect(hasExplainFields(stage)).toBe(true);
  });

  it("returns true for planning stages", () => {
    const stage = makePlanningStage();
    expect(hasExplainFields(stage)).toBe(true);
  });

  it("returns false for pipeline stages", () => {
    const stage = {
      layer: "pipeline" as const,
      id: "pipeline:$match" as never,
      fullName: "$match",
      description: "Match",
      category: StageCategory.Internal,
      iconName: "CircleQuestionMark" as const,
    };
    expect(hasExplainFields(stage as never)).toBe(false);
  });
});

describe("getFieldsForStage", () => {
  it("returns classic common fields for classic stage without explainFields", () => {
    const stage = makeStage({ engine: "classic" });
    const fields = getFieldsForStage(stage);
    expect(fields).toEqual(CLASSIC_COMMON_FIELDS);
  });

  it("returns SBE common fields for SBE stage without explainFields", () => {
    const stage = makeStage({ engine: "sbe" });
    const fields = getFieldsForStage(stage);
    expect(fields).toEqual(SBE_COMMON_FIELDS);
  });

  it("returns only stage-specific fields for planning stages (no engine common)", () => {
    const specificFields: ExplainFieldDeclaration[] = [
      {
        bsonKey: "direction",
        description: "Scan direction",
        valueType: "string",
        verbosity: "queryPlanner",
      },
    ];
    const stage = makePlanningStage({ explainFields: specificFields });
    const fields = getFieldsForStage(stage);
    expect(fields).toEqual(specificFields);
    // Should NOT include engine common fields
    expect(fields.some((f) => f.bsonKey === "nReturned")).toBe(false);
  });

  it("merges common + specific fields", () => {
    const specificFields: ExplainFieldDeclaration[] = [
      {
        bsonKey: "keysExamined",
        description: "Keys examined",
        valueType: "number",
        verbosity: "executionStats",
        unit: "count",
      },
    ];
    const stage = makeStage({
      engine: "classic",
      explainFields: specificFields,
    });
    const fields = getFieldsForStage(stage);
    expect(fields.length).toBe(CLASSIC_COMMON_FIELDS.length + 1);
    expect(fields[fields.length - 1]!.bsonKey).toBe("keysExamined");
  });
});

describe("getFieldsAtVerbosity", () => {
  const mixedFields: ExplainFieldDeclaration[] = [
    {
      bsonKey: "costEstimate",
      description: "Cost estimate",
      valueType: "number",
      verbosity: "queryPlanner",
    },
    {
      bsonKey: "nReturned",
      description: "Docs returned",
      valueType: "number",
      verbosity: "executionStats",
      unit: "count",
    },
  ];

  it("returns all fields for executionStats verbosity", () => {
    const result = getFieldsAtVerbosity(mixedFields, "executionStats");
    expect(result).toEqual(mixedFields);
  });

  it("returns all fields for allPlansExecution verbosity", () => {
    const result = getFieldsAtVerbosity(mixedFields, "allPlansExecution");
    expect(result).toEqual(mixedFields);
  });

  it("returns only queryPlanner fields for queryPlanner verbosity", () => {
    const result = getFieldsAtVerbosity(mixedFields, "queryPlanner");
    expect(result).toHaveLength(1);
    expect(result[0]!.bsonKey).toBe("costEstimate");
  });
});

describe("getRenamedFields", () => {
  it("returns only fields with cppName", () => {
    const result = getRenamedFields(CLASSIC_COMMON_FIELDS);
    expect(result.length).toBeGreaterThan(0);
    for (const field of result) {
      expect(field.cppName).toBeDefined();
    }
  });

  it("returns empty for fields without cppName", () => {
    const fields: ExplainFieldDeclaration[] = [
      {
        bsonKey: "usedDisk",
        description: "Used disk",
        valueType: "boolean",
        verbosity: "executionStats",
      },
    ];
    expect(getRenamedFields(fields)).toHaveLength(0);
  });
});

describe("common field arrays have no duplicate bsonKeys", () => {
  it("CLASSIC_COMMON_FIELDS has unique bsonKeys", () => {
    const keys = CLASSIC_COMMON_FIELDS.map((f) => f.bsonKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("SBE_COMMON_FIELDS has unique bsonKeys", () => {
    const keys = SBE_COMMON_FIELDS.map((f) => f.bsonKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("SPILLING_FIELDS has unique bsonKeys", () => {
    const keys = SPILLING_FIELDS.map((f) => f.bsonKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("CBR_FIELDS has unique bsonKeys", () => {
    const keys = CBR_FIELDS.map((f) => f.bsonKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("per-stage explainFields have no duplicate bsonKeys", () => {
  const executionStages = getAllStages().filter(isExecutionStage);

  for (const stage of executionStages) {
    if (stage.explainFields.length === 0) continue;

    it(`${stage.id} has unique bsonKeys in explainFields`, () => {
      const keys = stage.explainFields.map((f) => f.bsonKey);
      const duplicates = keys.filter((k, i) => keys.indexOf(k) !== i);
      expect(duplicates).toEqual([]);
    });
  }
});
