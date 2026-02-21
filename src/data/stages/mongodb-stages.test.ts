/**
 * Tests for MongoDB stage definitions data integrity
 *
 * Verifies that all stage definitions are well-formed and consistent.
 */

import { describe, it, expect } from "vitest";
import {
  STAGES,
  QUERY_SOLUTION_TYPE_TO_EXPLAIN_NAME,
  getAllStages,
  getStage,
  isPipelineStage,
  isPlanningStage,
  isExecutionStage,
  isSbeStage,
  isClassicStage,
  isMongosStage,
  getImplementations,
  getEngineSupport,
  StageIds,
  QuerySolutionStageType,
} from ".";
import { STAGE_ICON_COMPONENTS } from "#lib/visualization/stageIcons";

describe("MongoDB Stage Definitions", () => {
  const allStages = getAllStages();
  const pipelineStages = allStages.filter(isPipelineStage);
  const planningStages = allStages.filter(isPlanningStage);
  const executionStages = allStages.filter(isExecutionStage);
  const sbeStages = allStages.filter(isSbeStage);
  const classicStages = allStages.filter(isClassicStage);
  const mongosStages = allStages.filter(isMongosStage);

  describe("stage counts", () => {
    it("has expected total stage count", () => {
      expect(allStages.length).toBe(190);
    });

    it("has expected pipeline stage count", () => {
      expect(pipelineStages.length).toBe(42);
    });

    it("has expected planning stage count", () => {
      expect(planningStages.length).toBe(52);
    });

    it("has expected SBE stage count", () => {
      expect(sbeStages.length).toBe(45);
    });

    it("has expected Classic stage count", () => {
      expect(classicStages.length).toBe(46);
    });

    it("has expected mongos stage count", () => {
      expect(mongosStages.length).toBe(5);
    });

    it("execution stages = SBE + Classic", () => {
      expect(executionStages.length).toBe(
        sbeStages.length + classicStages.length,
      );
    });

    it("all stages = pipeline + planning + execution + mongos", () => {
      expect(allStages.length).toBe(
        pipelineStages.length +
          planningStages.length +
          executionStages.length +
          mongosStages.length,
      );
    });
  });

  describe("required fields", () => {
    it("all stages have an id", () => {
      for (const stage of allStages) {
        expect(stage.id, `Stage missing id`).toBeDefined();
        expect(typeof stage.id).toBe("string");
        expect(stage.id.length).toBeGreaterThan(0);
      }
    });

    it("all stages have a fullName", () => {
      for (const stage of allStages) {
        expect(
          stage.fullName,
          `Stage ${stage.id} missing fullName`,
        ).toBeDefined();
        expect(typeof stage.fullName).toBe("string");
        expect(stage.fullName.length).toBeGreaterThan(0);
      }
    });

    it("all stages have a description", () => {
      for (const stage of allStages) {
        expect(
          stage.description,
          `Stage ${stage.id} missing description`,
        ).toBeDefined();
        expect(typeof stage.description).toBe("string");
        expect(stage.description.length).toBeGreaterThan(0);
      }
    });

    it("all stages have a valid category", () => {
      const validCategories = [
        "collectionScan",
        "indexScan",
        "fetch",
        "aggregation",
        "transformation",
        "sort",
        "join",
        "filter",
        "geospatial",
        "textSearch",
        "timeSeries",
        "vectorSearch",
        "window",
        "writes",
        "queryPlanning",
        "systemMetadata",
        "internal",
      ];

      for (const stage of allStages) {
        expect(
          validCategories,
          `Stage ${stage.id} has invalid category: ${stage.category}`,
        ).toContain(stage.category);
      }
    });

    it("all stages have a layer", () => {
      for (const stage of allStages) {
        expect(stage.layer, `Stage ${stage.id} missing layer`).toBeDefined();
        expect(["pipeline", "planning", "execution", "mongos"]).toContain(
          stage.layer,
        );
      }
    });
  });

  describe("icon validation", () => {
    const validIconNames = Object.keys(STAGE_ICON_COMPONENTS);

    it("all stages have a valid iconName", () => {
      for (const stage of allStages) {
        expect(
          stage.iconName,
          `Stage ${stage.id} missing iconName`,
        ).toBeDefined();
        expect(
          validIconNames,
          `Stage ${stage.id} has invalid iconName: ${stage.iconName}`,
        ).toContain(stage.iconName);
      }
    });
  });

  describe("planning stage requirements", () => {
    it("all planning stages have a querySolutionStageType", () => {
      for (const stage of planningStages) {
        expect(
          stage.querySolutionStageType,
          `Planning stage ${stage.id} missing querySolutionStageType`,
        ).toBeDefined();
      }
    });

    it("all planning stages have blockingStage defined", () => {
      for (const stage of planningStages) {
        expect(
          typeof stage.blockingStage,
          `Planning stage ${stage.id} missing blockingStage`,
        ).toBe("boolean");
      }
    });

    it("all planning stages have canSpillToDisk defined", () => {
      for (const stage of planningStages) {
        expect(
          typeof stage.canSpillToDisk,
          `Planning stage ${stage.id} missing canSpillToDisk`,
        ).toBe("boolean");
      }
    });
  });

  describe("execution stage requirements", () => {
    it("all execution stages have an engine", () => {
      for (const stage of executionStages) {
        expect(stage.engine, `Stage ${stage.id} missing engine`).toBeDefined();
        expect(["sbe", "classic"]).toContain(stage.engine);
      }
    });

    it("all execution stages have blockingStage defined", () => {
      for (const stage of executionStages) {
        expect(
          typeof stage.blockingStage,
          `Stage ${stage.id} missing blockingStage`,
        ).toBe("boolean");
      }
    });

    it("all execution stages have canSpillToDisk defined", () => {
      for (const stage of executionStages) {
        expect(
          typeof stage.canSpillToDisk,
          `Stage ${stage.id} missing canSpillToDisk`,
        ).toBe("boolean");
      }
    });
  });

  describe("ID uniqueness", () => {
    it("no duplicate IDs within the same layer", () => {
      for (const [layerName, layerStages] of [
        ["pipeline", pipelineStages],
        ["planning", planningStages],
        ["execution", executionStages],
        ["mongos", mongosStages],
      ] as const) {
        const ids = layerStages.map((s) => s.id);
        const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
        expect(
          duplicates,
          `Duplicate IDs in ${layerName} layer: ${duplicates.join(", ")}`,
        ).toHaveLength(0);
      }
    });

    it("STAGES dictionary keys match stage.id values for each layer", () => {
      for (const [layerName, dict] of [
        ["pipeline", STAGES.pipeline],
        ["planning", STAGES.planning],
        ["execution", STAGES.execution],
        ["mongos", STAGES.mongos],
      ] as const) {
        for (const [key, stage] of Object.entries(dict)) {
          expect(
            key,
            `${layerName} key "${key}" doesn't match stage.id "${stage.id}"`,
          ).toBe(stage.id);
        }
      }
    });
  });

  describe("builtFromUserSyntax relationships", () => {
    it("all referenced pipeline stages exist in planning stages", () => {
      for (const stage of planningStages) {
        if (stage.builtFromUserSyntax) {
          for (const pipelineId of stage.builtFromUserSyntax) {
            const referenced = getStage("pipeline", pipelineId as string);
            expect(
              referenced,
              `Planning stage ${stage.id} references non-existent pipeline stage: ${pipelineId}`,
            ).toBeDefined();
          }
        }
      }
    });

    it("execution stages link back to planning via querySolutionStageType", () => {
      for (const stage of executionStages) {
        if (stage.querySolutionStageType) {
          const explainName =
            QUERY_SOLUTION_TYPE_TO_EXPLAIN_NAME[stage.querySolutionStageType];
          expect(
            explainName,
            `Execution stage ${stage.id} has querySolutionStageType ${stage.querySolutionStageType} with no explain name mapping`,
          ).toBeDefined();
        }
      }
    });
  });

  describe("naming conventions", () => {
    it("pipeline stages start with $", () => {
      for (const stage of pipelineStages) {
        expect(
          stage.id.startsWith("$"),
          `Pipeline stage ${stage.id} should start with $`,
        ).toBe(true);
      }
    });

    it("planning stages are UPPER_CASE", () => {
      for (const stage of planningStages) {
        expect(
          /^[A-Z0-9_]+$/.test(stage.id),
          `Planning stage ${stage.id} should be UPPER_CASE`,
        ).toBe(true);
      }
    });

    it("classic stages are UPPER_CASE or have underscores", () => {
      for (const stage of classicStages) {
        expect(
          /^[A-Z0-9_]+$/.test(stage.id),
          `Classic stage ${stage.id} should be UPPER_CASE`,
        ).toBe(true);
      }
    });

    it("SBE stages are lowercase/snake_case", () => {
      for (const stage of sbeStages) {
        expect(
          /^[a-z0-9_]+$/.test(stage.id),
          `SBE stage ${stage.id} should be lowercase/snake_case`,
        ).toBe(true);
      }
    });
  });
});

describe("getStage", () => {
  describe("pipeline layer", () => {
    it("returns pipeline stage for $match", () => {
      const stage = getStage("pipeline", "$match");
      expect(stage).toBeDefined();
      expect(stage?.id).toBe("$match");
      expect(stage?.layer).toBe("pipeline");
    });

    it("returns undefined for non-pipeline names", () => {
      expect(getStage("pipeline", "GROUP")).toBeUndefined();
      expect(getStage("pipeline", "scan")).toBeUndefined();
    });
  });

  describe("planning layer", () => {
    it("returns planning stage for GROUP", () => {
      const stage = getStage("planning", "GROUP");
      expect(stage).toBeDefined();
      expect(stage?.id).toBe("GROUP");
      expect(stage?.layer).toBe("planning");
    });

    it("returns planning stage for MATCH", () => {
      const stage = getStage("planning", "MATCH");
      expect(stage).toBeDefined();
      expect(stage?.id).toBe("MATCH");
    });

    it("returns planning stage for COLLSCAN", () => {
      const stage = getStage("planning", "COLLSCAN");
      expect(stage).toBeDefined();
      expect(stage?.layer).toBe("planning");
    });

    it("returns undefined for SBE execution name", () => {
      expect(getStage("planning", "group")).toBeUndefined();
    });

    it("returns undefined for unknown stages", () => {
      expect(getStage("planning", "NONEXISTENT")).toBeUndefined();
    });

    it("resolves all planning-only stage names", () => {
      const planningOnlyNames = [
        "GROUP",
        "MATCH",
        "EQ_LOOKUP",
        "EQ_LOOKUP_UNWIND",
        "WINDOW",
        "SEARCH",
        "UNWIND",
        "REPLACE_ROOT",
        "UNPACK_SAMPLED_TS_BUCKET",
        "HASH_JOIN_EMBEDDING",
        "NESTED_LOOP_JOIN_EMBEDDING",
        "INDEXED_NESTED_LOOP_JOIN_EMBEDDING",
        "INDEX_PROBE_NODE",
      ];

      for (const name of planningOnlyNames) {
        const stage = getStage("planning", name);
        expect(
          stage,
          `getStage("planning", "${name}") returned undefined`,
        ).toBeDefined();
        expect(stage?.layer).toBe("planning");
      }
    });
  });

  describe("execution layer", () => {
    it("returns SBE stage for group", () => {
      const stage = getStage("execution", "group");
      expect(stage).toBeDefined();
      expect(stage?.id).toBe("group");
      expect(stage?.engine).toBe("sbe");
    });

    it("returns classic stage for COLLSCAN", () => {
      const stage = getStage("execution", "COLLSCAN");
      expect(stage).toBeDefined();
      expect(stage?.id).toBe("COLLSCAN");
      expect(stage?.engine).toBe("classic");
    });

    it("returns undefined for planning-only names like GROUP", () => {
      expect(getStage("execution", "GROUP")).toBeUndefined();
    });

    it("returns undefined for unknown stages", () => {
      expect(getStage("execution", "NONEXISTENT")).toBeUndefined();
    });
  });

  describe("mongos layer", () => {
    it("returns mongos stage for SHARD_MERGE", () => {
      const stage = getStage("mongos", "SHARD_MERGE");
      expect(stage).toBeDefined();
      expect(stage?.layer).toBe("mongos");
    });

    it("returns undefined for non-mongos names", () => {
      expect(getStage("mongos", "COLLSCAN")).toBeUndefined();
    });
  });

  describe("planning vs execution disambiguation", () => {
    it("COLLSCAN exists in both planning and execution as different objects", () => {
      const planning = getStage("planning", "COLLSCAN");
      const execution = getStage("execution", "COLLSCAN");
      expect(planning).toBeDefined();
      expect(execution).toBeDefined();
      expect(planning?.layer).toBe("planning");
      expect(execution?.layer).toBe("execution");
      expect(planning).not.toBe(execution);
    });

    it("GROUP exists in planning but not execution", () => {
      expect(getStage("planning", "GROUP")).toBeDefined();
      expect(getStage("execution", "GROUP")).toBeUndefined();
    });

    it("group (lowercase) exists in execution but not planning", () => {
      expect(getStage("execution", "group")).toBeDefined();
      expect(getStage("planning", "group")).toBeUndefined();
    });
  });
});

describe("QUERY_SOLUTION_TYPE_TO_EXPLAIN_NAME", () => {
  it("covers every QuerySolutionStageType enum value", () => {
    const enumValues = Object.values(QuerySolutionStageType);
    for (const value of enumValues) {
      expect(
        QUERY_SOLUTION_TYPE_TO_EXPLAIN_NAME[value],
        `Missing mapping for ${value}`,
      ).toBeDefined();
    }
  });

  it("maps GROUP correctly", () => {
    expect(
      QUERY_SOLUTION_TYPE_TO_EXPLAIN_NAME[QuerySolutionStageType.STAGE_GROUP],
    ).toBe("GROUP");
  });

  it("maps both SORT variants to SORT", () => {
    expect(
      QUERY_SOLUTION_TYPE_TO_EXPLAIN_NAME[
        QuerySolutionStageType.STAGE_SORT_DEFAULT
      ],
    ).toBe("SORT");
    expect(
      QUERY_SOLUTION_TYPE_TO_EXPLAIN_NAME[
        QuerySolutionStageType.STAGE_SORT_SIMPLE
      ],
    ).toBe("SORT");
  });
});

describe("Stage Utility Functions", () => {
  describe("getImplementations", () => {
    it("returns planning stages for $group", () => {
      const impls = getImplementations(StageIds.pipeline("$group"));
      expect(impls.length).toBeGreaterThan(0);

      const planningImpl = impls.find((s) => s.layer === "planning");
      expect(planningImpl).toBeDefined();
      expect(planningImpl?.id).toBe("GROUP");
    });

    it("returns empty array for stages with no implementations", () => {
      const impls = getImplementations(StageIds.pipeline("$changeStream"));
      expect(Array.isArray(impls)).toBe(true);
    });
  });

  describe("getEngineSupport", () => {
    it("returns support matrix for pipeline stages", () => {
      const support = getEngineSupport(StageIds.pipeline("$match"));
      expect(support).toHaveProperty("sbe");
      expect(support).toHaveProperty("classic");
      expect(["full", "partial", "none"]).toContain(support.sbe);
      expect(["full", "partial", "none"]).toContain(support.classic);
    });
  });
});

describe("Data Coverage and Exports", () => {
  const allStages = getAllStages();

  describe("category coverage", () => {
    it("all defined categories are used by at least one stage", () => {
      const validCategories = [
        "collectionScan",
        "indexScan",
        "fetch",
        "aggregation",
        "transformation",
        "sort",
        "join",
        "filter",
        "geospatial",
        "textSearch",
        "timeSeries",
        "vectorSearch",
        "window",
        "writes",
        "queryPlanning",
        "systemMetadata",
        "internal",
      ];

      const usedCategories = new Set(
        allStages.map((s) => s.category as string),
      );
      const unusedCategories = validCategories.filter(
        (cat) => !usedCategories.has(cat),
      );

      expect(
        unusedCategories,
        `Unused categories: ${unusedCategories.join(", ")}`,
      ).toHaveLength(0);
    });
  });

  describe("icon coverage", () => {
    it("all icons used by stages are defined in STAGE_ICON_COMPONENTS", () => {
      const usedIcons = new Set(allStages.map((s) => s.iconName as string));
      const definedIcons = new Set(Object.keys(STAGE_ICON_COMPONENTS));

      for (const icon of usedIcons) {
        expect(
          definedIcons.has(icon),
          `Icon "${icon}" is used but not defined in STAGE_ICON_COMPONENTS`,
        ).toBe(true);
      }
    });

    it("no stage uses CircleQuestionMark fallback icon", () => {
      const stagesWithFallbackIcon = allStages.filter(
        (s) => s.iconName === "CircleQuestionMark",
      );

      if (stagesWithFallbackIcon.length > 0) {
        const stageIds = stagesWithFallbackIcon.map((s) => s.id).join(", ");
        expect.fail(
          `${stagesWithFallbackIcon.length} stage(s) use CircleQuestionMark fallback icon: ${stageIds}. ` +
            `All stages should have a meaningful icon defined.`,
        );
      }
    });

    it("reports which defined icons are not used (informational)", () => {
      const usedIcons = new Set(allStages.map((s) => s.iconName as string));
      const definedIcons = Object.keys(STAGE_ICON_COMPONENTS);
      const unusedIcons = definedIcons.filter((icon) => !usedIcons.has(icon));

      if (unusedIcons.length > 0) {
        console.log(
          `Info: ${unusedIcons.length} defined icons not used by stages: ${unusedIcons.join(", ")}`,
        );
      }
      expect(true).toBe(true);
    });
  });

  describe("pipeline stages are aggregation stages, not query operators", () => {
    const queryOperators = [
      "$eq",
      "$gt",
      "$gte",
      "$lt",
      "$lte",
      "$ne",
      "$in",
      "$nin",
      "$and",
      "$or",
      "$not",
      "$nor",
      "$exists",
      "$type",
      "$regex",
      "$text",
      "$where",
      "$all",
      "$elemMatch",
      "$size",
    ];

    it("no query operators are mistakenly included as pipeline stages", () => {
      const pipelineIds = allStages.filter(isPipelineStage).map((s) => s.id);

      const mistakenlIncluded = pipelineIds.filter((id) =>
        queryOperators.includes(id),
      );

      expect(
        mistakenlIncluded,
        `Query operators should not be in pipeline stages: ${mistakenlIncluded.join(", ")}`,
      ).toHaveLength(0);
    });
  });
});

describe("Type Guards", () => {
  const allStages = getAllStages();

  describe("isPipelineStage", () => {
    it("returns true for pipeline stages", () => {
      const stage = getStage("pipeline", "$match");
      expect(isPipelineStage(stage!)).toBe(true);
    });

    it("returns false for execution stages", () => {
      const stage = getStage("execution", "COLLSCAN");
      expect(isPipelineStage(stage!)).toBe(false);
    });
  });

  describe("isPlanningStage", () => {
    it("returns true for planning stages", () => {
      const stage = getStage("planning", "GROUP");
      expect(isPlanningStage(stage!)).toBe(true);
    });

    it("returns false for execution stages", () => {
      const stage = getStage("execution", "COLLSCAN");
      expect(isPlanningStage(stage!)).toBe(false);
    });

    it("returns false for pipeline stages", () => {
      const stage = getStage("pipeline", "$match");
      expect(isPlanningStage(stage!)).toBe(false);
    });
  });

  describe("isExecutionStage", () => {
    it("returns true for execution stages", () => {
      const stage = getStage("execution", "COLLSCAN");
      expect(isExecutionStage(stage!)).toBe(true);
    });

    it("returns false for pipeline stages", () => {
      const stage = getStage("pipeline", "$match");
      expect(isExecutionStage(stage!)).toBe(false);
    });
  });

  describe("isSbeStage", () => {
    it("returns true for SBE stages", () => {
      const stage = getStage("execution", "scan");
      expect(isSbeStage(stage!)).toBe(true);
    });

    it("returns false for Classic stages", () => {
      const stage = getStage("execution", "COLLSCAN");
      expect(isSbeStage(stage!)).toBe(false);
    });

    it("returns false for pipeline stages", () => {
      const stage = getStage("pipeline", "$match");
      expect(isSbeStage(stage!)).toBe(false);
    });
  });

  describe("isClassicStage", () => {
    it("returns true for Classic stages", () => {
      const stage = getStage("execution", "COLLSCAN");
      expect(isClassicStage(stage!)).toBe(true);
    });

    it("returns false for SBE stages", () => {
      const stage = getStage("execution", "scan");
      expect(isClassicStage(stage!)).toBe(false);
    });

    it("returns false for pipeline stages", () => {
      const stage = getStage("pipeline", "$match");
      expect(isClassicStage(stage!)).toBe(false);
    });
  });

  describe("partition correctness", () => {
    it("every stage is exactly one type", () => {
      for (const stage of allStages) {
        const isPipeline = isPipelineStage(stage);
        const isPlanning = isPlanningStage(stage);
        const isSbe = isSbeStage(stage);
        const isClassic = isClassicStage(stage);
        const isMongos = isMongosStage(stage);

        const trueCount = [
          isPipeline,
          isPlanning,
          isSbe,
          isClassic,
          isMongos,
        ].filter(Boolean).length;
        expect(
          trueCount,
          `Stage ${stage.id} matched ${trueCount} type guards (expected 1)`,
        ).toBe(1);
      }
    });
  });
});
