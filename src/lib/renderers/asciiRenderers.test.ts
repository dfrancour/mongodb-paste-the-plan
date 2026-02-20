import { describe, it, expect } from "vitest";
import type { NormalizedStage, ParsedSBEPlan } from "#types/explain-plan";
import { PlanFlowASCIIRenderer, SlotFlowASCIIRenderer } from "./asciiRenderers";
import { StageCategory } from "#data/stages";

describe("ASCII Rendering", () => {
  describe("PlanFlowASCIIRenderer", () => {
    describe("renderClassicPlanWithMode", () => {
      it("should render a simple IXSCAN stage", () => {
        const stage: NormalizedStage = {
          id: "root",
          stage: "IXSCAN",
          category: StageCategory.IndexScan,
          iconName: "Search",
          depth: 0,
          children: [],
          structure: { indexName: "users_status_idx" },
          metrics: {
            nReturned: 100,
            keysExamined: 1000,
            docsExamined: 100,
            executionTimeMillis: 15,
          },
        };

        const result = PlanFlowASCIIRenderer.renderClassicPlanWithMode(stage);

        expect(result).toContain("Query Execution Plan (Classic Engine)");
        expect(result).toContain(
          "└─ IXSCAN [executionTimeMillis=15, nReturned=100, docsExamined=100, keysExamined=1000]",
        );
        expect(result).toContain("users_status_idx");
      });

      it("should render nested stages with proper tree structure", () => {
        const stage: NormalizedStage = {
          id: "root",
          stage: "PROJECTION_SIMPLE",
          category: StageCategory.Transformation,
          iconName: "Columns",
          depth: 0,
          structure: {},
          children: [
            {
              id: "root.0",
              stage: "IXSCAN",
              category: StageCategory.IndexScan,
              iconName: "Search",
              depth: 1,
              children: [],
              structure: { indexName: "users_status_idx" },
              metrics: {
                nReturned: 100,
                keysExamined: 1000,
                executionTimeMillis: 15,
              },
            },
          ],
          metrics: {
            nReturned: 100,
            executionTimeMillis: 5,
          },
        };

        const result = PlanFlowASCIIRenderer.renderClassicPlanWithMode(stage);

        expect(result).toContain(
          "└─ PROJECTION_SIMPLE [executionTimeMillis=5, nReturned=100]",
        );
        expect(result).toContain(
          "└─ IXSCAN [executionTimeMillis=15, nReturned=100, keysExamined=1000]",
        );
        expect(result).toContain("users_status_idx");
      });

      it("should render multiple children with proper connectors", () => {
        const stage: NormalizedStage = {
          id: "root",
          stage: "OR",
          category: StageCategory.QueryPlanning,
          iconName: "GitBranch",
          depth: 0,
          structure: {},
          children: [
            {
              id: "root.0",
              stage: "IXSCAN",
              category: StageCategory.IndexScan,
              iconName: "Search",
              depth: 1,
              children: [],
              structure: { indexName: "idx_1" },
              metrics: { nReturned: 50, keysExamined: 500 },
            },
            {
              id: "root.1",
              stage: "IXSCAN",
              category: StageCategory.IndexScan,
              iconName: "Search",
              depth: 1,
              children: [],
              structure: { indexName: "idx_2" },
              metrics: { nReturned: 50, keysExamined: 500 },
            },
          ],
          metrics: { nReturned: 100 },
        };

        const result = PlanFlowASCIIRenderer.renderClassicPlanWithMode(stage);

        expect(result).toContain("└─ OR");
        expect(result).toContain("  ├─ IXSCAN"); // First child uses branch connector
        expect(result).toContain("  └─ IXSCAN"); // Last child uses last branch connector
        expect(result).toContain("idx_1");
        expect(result).toContain("idx_2");
      });

      it("should handle stages with no metrics gracefully", () => {
        const stage: NormalizedStage = {
          id: "root",
          stage: "COLLSCAN",
          category: StageCategory.CollectionScan,
          iconName: "FolderSearch",
          depth: 0,
          children: [],
          structure: {},
          metrics: {},
        };

        const result = PlanFlowASCIIRenderer.renderClassicPlanWithMode(stage);

        expect(result).toContain("└─ COLLSCAN");
        expect(result).not.toContain("undefined");
        expect(result).not.toContain("NaN");
      });

      it("should show metrics for collection scans", () => {
        const stage: NormalizedStage = {
          id: "root",
          stage: "COLLSCAN",
          category: StageCategory.CollectionScan,
          iconName: "FolderSearch",
          depth: 0,
          children: [],
          structure: {},
          metrics: {
            nReturned: 10,
            docsExamined: 100000,
            executionTimeMillis: 500,
          },
        };

        const result = PlanFlowASCIIRenderer.renderClassicPlanWithMode(stage);

        expect(result).toContain("COLLSCAN");
        expect(result).toContain("executionTimeMillis=500");
        expect(result).toContain("nReturned=10");
        expect(result).toContain("docsExamined=100000");
      });
    });

    describe("renderSBEPlan", () => {
      it("should render SBE plan with stage hierarchy", () => {
        const sbePlan: ParsedSBEPlan = {
          explainVersion: "2",
          slotEnvironment: { resultSlot: "s41", slots: {} },
          stages: [
            {
              nodeId: 1,
              stageType: "project",
              slotReferences: ["s35", "s41"],
              details: "project [s11 = getSortKeyAsc(s10)]",
              children: [],
            },
            {
              nodeId: 2,
              stageType: "ixscan",
              slotReferences: ["s2", "s12"],
              details: "ixscan s1 s2 s6 s3 s4 s5",
              children: [],
            },
          ],
          slotLineages: [],
          stageMetrics: [],
          queryPlanStages: new Map([
            [1, "PROJECTION_SIMPLE"],
            [2, "IXSCAN"],
          ]),
          executionStatsMap: new Map(),
          originalSlotString: "",
          originalStagesString: "",
        };

        const result = PlanFlowASCIIRenderer.renderSBEPlan(sbePlan);

        expect(result).toContain("Query Execution Plan (SBE Engine)");
        expect(result).toContain("[2] IXSCAN");
        expect(result).toContain("[1] PROJECTION_SIMPLE");
        expect(result).toContain("s2, s12");
        expect(result).toContain("s35, s41");
      });

      it("should handle empty SBE plans", () => {
        const sbePlan: ParsedSBEPlan = {
          explainVersion: "2",
          slotEnvironment: { resultSlot: "", slots: {} },
          stages: [],
          slotLineages: [],
          stageMetrics: [],
          queryPlanStages: new Map(),
          executionStatsMap: new Map(),
          originalSlotString: "",
          originalStagesString: "",
        };

        const result = PlanFlowASCIIRenderer.renderSBEPlan(sbePlan);

        expect(result).toContain("Query Execution Plan (SBE Engine)");
        expect(result).not.toContain("undefined");
      });
    });
  });

  describe("SlotFlowASCIIRenderer", () => {
    describe("renderSlotFlow", () => {
      it("should render slot flow with stage tree and slot chain", () => {
        const sbePlan: ParsedSBEPlan = {
          explainVersion: "2",
          slotEnvironment: { resultSlot: "s41", slots: {} },
          stages: [
            {
              nodeId: 1,
              stageType: "project",
              slotReferences: ["s35", "s41"],
              details: "project [s11 = getSortKeyAsc(s10)]",
              children: [],
            },
            {
              nodeId: 2,
              stageType: "ixscan",
              slotReferences: ["s2", "s12"],
              details: "ixscan s1 s2 s6 s3 s4 s5",
              children: [],
            },
          ],
          slotLineages: [
            {
              slotId: "s2",
              definition: {
                slotId: "s2",
                createdAt: "environment",
                slotType: "context_constant",
                initialValue: "IndexBounds(...)",
                fieldOrigin: undefined,
              },
              usages: [],
              ancestors: [],
              descendants: ["s12"],
              transformations: [],
              inferredMeaning: "Index bounds for scan",
            },
            {
              slotId: "s12",
              definition: {
                slotId: "s12",
                createdAt: "[2] ixscan",
                slotType: "field_path",
                initialValue: undefined,
                fieldOrigin: "_id",
              },
              usages: [
                {
                  slotId: "s12",
                  usedAt: "[1] project",
                  operation: "input",
                  purpose: "projection",
                },
              ],
              ancestors: ["s2"],
              descendants: ["s35"],
              transformations: [],
              inferredMeaning: "Record ID from index scan",
            },
          ],
          stageMetrics: [],
          queryPlanStages: new Map([
            [1, "PROJECTION_SIMPLE"],
            [2, "IXSCAN"],
          ]),
          executionStatsMap: new Map(),
          originalSlotString: "",
          originalStagesString: "",
        };

        const result = SlotFlowASCIIRenderer.renderSlotFlow(sbePlan);

        expect(result).toContain("SBE Slot-Based Execution Flow");
        expect(result).toContain("Stage Tree:");
        expect(result).toContain("Slot Flow:");
        expect(result).toContain("[2] IXSCAN");
        expect(result).toContain("[1] PROJECTION_SIMPLE");
        expect(result).toContain("Slot Details:");
        expect(result).toContain("s2");
        expect(result).toContain("s12");
      });

      it("should handle single stage SBE plans", () => {
        const sbePlan: ParsedSBEPlan = {
          explainVersion: "2",
          slotEnvironment: { resultSlot: "s5", slots: {} },
          stages: [
            {
              nodeId: 1,
              stageType: "scan",
              slotReferences: ["s5"],
              details: "scan collection",
              children: [],
            },
          ],
          slotLineages: [],
          stageMetrics: [],
          queryPlanStages: new Map([[1, "COLLSCAN"]]),
          executionStatsMap: new Map(),
          originalSlotString: "",
          originalStagesString: "",
        };

        const result = SlotFlowASCIIRenderer.renderSlotFlow(sbePlan);

        expect(result).toContain("SBE Slot-Based Execution Flow");
        expect(result).toContain("[1] COLLSCAN");
        expect(result).toContain("s5 (result)");
      });

      it("should render slot details for complex lineages", () => {
        const sbePlan: ParsedSBEPlan = {
          explainVersion: "2",
          slotEnvironment: { resultSlot: "s10", slots: {} },
          stages: [],
          slotLineages: [
            {
              slotId: "s1",
              definition: {
                slotId: "s1",
                createdAt: "[1] scan",
                slotType: "field_path",
                fieldOrigin: "name",
              },
              usages: [],
              ancestors: [],
              descendants: ["s5"],
              transformations: [],
              inferredMeaning: "Document field: name",
            },
            {
              slotId: "s5",
              definition: {
                slotId: "s5",
                createdAt: "[2] filter",
                slotType: "expression",
                fieldOrigin: undefined,
              },
              usages: [],
              ancestors: ["s1"],
              descendants: ["s10"],
              transformations: [],
              inferredMeaning: "Filtered documents",
            },
          ],
          stageMetrics: [],
          queryPlanStages: new Map(),
          executionStatsMap: new Map(),
          originalSlotString: "",
          originalStagesString: "",
        };

        const result = SlotFlowASCIIRenderer.renderSlotFlow(sbePlan);

        expect(result).toContain("Slot Details:");
        expect(result).toContain("s1");
        expect(result).toContain("s5");
      });
    });
  });

  describe("Error handling", () => {
    it("should handle null or undefined inputs gracefully", () => {
      expect(() => {
        PlanFlowASCIIRenderer.renderClassicPlanWithMode(
          null as unknown as NormalizedStage,
        );
      }).not.toThrow();

      expect(() => {
        SlotFlowASCIIRenderer.renderSlotFlow(null as unknown as ParsedSBEPlan);
      }).not.toThrow();
    });

    it("should handle malformed stage data", () => {
      const malformedStage = {
        id: "root",
        stage: "UNKNOWN_STAGE",
        category: StageCategory.Unknown,
        iconName: "CircleQuestionMark",
        depth: 0,
        children: [],
        structure: {},
        metrics: {
          nReturned: "invalid" as unknown as number,
          keysExamined: null as unknown as number,
        },
      } as unknown as NormalizedStage;

      const result =
        PlanFlowASCIIRenderer.renderClassicPlanWithMode(malformedStage);

      expect(result).toContain("UNKNOWN_STAGE");
      expect(result).not.toContain("null");
      expect(result).not.toContain("undefined");
    });
  });

  describe("Metrics rendering", () => {
    it("should show metrics for covered queries", () => {
      const stage: NormalizedStage = {
        id: "root",
        stage: "PROJECTION_COVERED",
        category: StageCategory.Transformation,
        iconName: "Columns",
        depth: 0,
        children: [],
        structure: {},
        metrics: {
          nReturned: 100,
          keysExamined: 100,
          executionTimeMillis: 5,
        },
      };

      const result = PlanFlowASCIIRenderer.renderClassicPlanWithMode(stage);
      expect(result).toContain("PROJECTION_COVERED");
      expect(result).toContain("executionTimeMillis=5");
      expect(result).toContain("nReturned=100");
    });

    it("should show metrics for collection scans", () => {
      const stage: NormalizedStage = {
        id: "root",
        stage: "COLLSCAN",
        category: StageCategory.CollectionScan,
        iconName: "FolderSearch",
        depth: 0,
        children: [],
        structure: {},
        metrics: {
          nReturned: 10,
          docsExamined: 50000,
          executionTimeMillis: 1000,
        },
      };

      const result = PlanFlowASCIIRenderer.renderClassicPlanWithMode(stage);
      expect(result).toContain("COLLSCAN");
      expect(result).toContain("executionTimeMillis=1000");
      expect(result).toContain("nReturned=10");
      expect(result).toContain("docsExamined=50000");
    });

    it("should show metrics for index scans", () => {
      const stage: NormalizedStage = {
        id: "root",
        stage: "IXSCAN",
        category: StageCategory.IndexScan,
        iconName: "Search",
        depth: 0,
        children: [],
        structure: {},
        metrics: {
          nReturned: 5,
          keysExamined: 1000,
          executionTimeMillis: 50,
        },
      };

      const result = PlanFlowASCIIRenderer.renderClassicPlanWithMode(stage);
      expect(result).toContain("IXSCAN");
      expect(result).toContain("executionTimeMillis=50");
      expect(result).toContain("nReturned=5");
      expect(result).toContain("keysExamined=1000");
    });
  });
});
