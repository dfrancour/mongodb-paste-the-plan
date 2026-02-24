import { describe, it, expect } from "vitest";
import { isSBEPlan, extractSBEPlan } from "#lib/parsers";
import { calculateSBELayoutForStages } from "./flowLayoutEngine";
import { StageCategory, getStage } from "#data/stages";
import { loadTestPlan } from "#test-utils/test-helpers";

describe("Text Search Multi-Input Layout", () => {
  it("should create individual FlowStages for each IXSCAN in text search query", () => {
    const explainPlan = loadTestPlan("complex/text-search.executionStats.json");

    // Verify it's an SBE plan
    expect(isSBEPlan(explainPlan)).toBe(true);

    // Parse the SBE plan
    const sbePlan = extractSBEPlan(explainPlan);
    expect(sbePlan).toBeTruthy();

    if (!sbePlan) return;

    // Verify we have the expected queryPlan stages for text search
    expect(sbePlan.queryPlanStages.size).toBeGreaterThanOrEqual(6);

    // Check for the multi-input structure: 3 IXSCAN stages (nodes 1,2,3) + OR/UNION (node 4) + FETCH (node 5) + TEXT_MATCH (node 6)
    expect(sbePlan.queryPlanStages.get(1)).toBe("IXSCAN"); // First search term
    expect(sbePlan.queryPlanStages.get(2)).toBe("IXSCAN"); // Second search term
    expect(sbePlan.queryPlanStages.get(3)).toBe("IXSCAN"); // Third search term
    expect(sbePlan.queryPlanStages.get(4)).toBe("OR"); // Union of search results
    expect(sbePlan.queryPlanStages.get(5)).toBe("FETCH"); // Document fetch
    expect(sbePlan.queryPlanStages.get(6)).toBe("TEXT_MATCH"); // Text matching filter
  });

  it("should create proper multi-level layout for text search with horizontal IXSCAN positioning", () => {
    const explainPlan = loadTestPlan("complex/text-search.executionStats.json");

    const sbePlan = extractSBEPlan(explainPlan);
    if (!sbePlan) throw new Error("Failed to parse SBE plan");

    // Create FlowStages (this should now create individual stages for each planNodeId)
    const flowStages = Array.from(sbePlan.queryPlanStages.entries())
      .sort(([a], [b]) => a - b)
      .map(([nodeId, stageName]) => ({
        id: `sbe_node_${nodeId}`,
        stage: stageName,
        category:
          getStage("execution", stageName)?.category ?? StageCategory.Unknown,
        iconName:
          getStage("execution", stageName)?.iconName ?? "CircleQuestionMark",
        structure: {},
        metrics: {
          nReturned: 0,
          docsExamined: 0,
          keysExamined: 0,
          executionTimeMillis: 0,
        },
        children: [],
        depth: 0,
        position: { x: 0, y: 0, level: 0 },
        connections: [],
        visualization: {
          performanceLevel: "good" as const,
          primaryMetric: `SBE: ${stageName}`,
          secondaryMetric: "",
          warnings: [],
        },
        state: { isHighlighted: false, showTooltip: false },
      }));

    // Verify we have 6 individual FlowStages
    expect(flowStages.length).toBe(6);
    expect(flowStages.map((s) => s.stage)).toEqual([
      "IXSCAN",
      "IXSCAN",
      "IXSCAN",
      "OR",
      "FETCH",
      "TEXT_MATCH",
    ]);

    // Calculate layout
    const layout = calculateSBELayoutForStages(flowStages, sbePlan);

    // Verify layout creates proper positioning
    expect(layout.nodes.size).toBe(6);

    // Verify level assignments — levels are in layout order (root=0 at top,
    // leaves at highest level at bottom) so the shared vertical positioning
    // module places them correctly.
    const ixscanNode1 = layout.nodes.get("sbe_node_1");
    const ixscanNode2 = layout.nodes.get("sbe_node_2");
    const ixscanNode3 = layout.nodes.get("sbe_node_3");
    const orNode = layout.nodes.get("sbe_node_4");
    const fetchNode = layout.nodes.get("sbe_node_5");
    const textMatchNode = layout.nodes.get("sbe_node_6");

    expect(textMatchNode?.level).toBe(0); // Top level (root)
    expect(fetchNode?.level).toBe(1); // Second from top
    expect(orNode?.level).toBe(2); // Third from top
    expect(ixscanNode1?.level).toBe(3); // Bottom level (leaf)
    expect(ixscanNode2?.level).toBe(3); // Bottom level (leaf)
    expect(ixscanNode3?.level).toBe(3); // Bottom level (leaf)

    // Verify horizontal positioning - IXSCAN stages should have different x coordinates
    expect(ixscanNode1?.x).not.toBe(ixscanNode2?.x);
    expect(ixscanNode2?.x).not.toBe(ixscanNode3?.x);
    expect(ixscanNode1?.x).not.toBe(ixscanNode3?.x);

    // Verify bottom-to-top flow - higher levels should have higher y coordinates
    expect(ixscanNode1?.y).toBeGreaterThan(orNode?.y ?? 0);
    expect(orNode?.y).toBeGreaterThan(fetchNode?.y ?? 0);
    expect(fetchNode?.y).toBeGreaterThan(textMatchNode?.y ?? 0);
  });

  it("should create proper dependencies for text search multi-input merge", () => {
    const explainPlan = loadTestPlan("complex/text-search.executionStats.json");

    const sbePlan = extractSBEPlan(explainPlan);
    if (!sbePlan) throw new Error("Failed to parse SBE plan");

    // Create FlowStages
    const flowStages = Array.from(sbePlan.queryPlanStages.entries())
      .sort(([a], [b]) => a - b)
      .map(([nodeId, stageName]) => ({
        id: `sbe_node_${nodeId}`,
        stage: stageName,
        category:
          getStage("execution", stageName)?.category ?? StageCategory.Unknown,
        iconName:
          getStage("execution", stageName)?.iconName ?? "CircleQuestionMark",
        structure: {},
        metrics: {
          nReturned: 0,
          docsExamined: 0,
          keysExamined: 0,
          executionTimeMillis: 0,
        },
        children: [],
        depth: 0,
        position: { x: 0, y: 0, level: 0 },
        connections: [],
        visualization: {
          performanceLevel: "good" as const,
          primaryMetric: `SBE: ${stageName}`,
          secondaryMetric: "",
          warnings: [],
        },
        state: { isHighlighted: false, showTooltip: false },
      }));

    // Calculate layout
    const layout = calculateSBELayoutForStages(flowStages, sbePlan);

    // Verify connections - OR node should have connections FROM all 3 IXSCAN nodes
    const orConnections = layout.connections.filter(
      (conn) => conn.to === "sbe_node_4",
    );
    expect(orConnections.length).toBe(3);
    expect(orConnections.map((c) => c.from).sort()).toEqual([
      "sbe_node_1",
      "sbe_node_2",
      "sbe_node_3",
    ]);

    // Verify FETCH depends on OR
    const fetchConnections = layout.connections.filter(
      (conn) => conn.to === "sbe_node_5",
    );
    expect(fetchConnections.length).toBe(1);
    expect(fetchConnections[0]?.from).toBe("sbe_node_4");

    // Verify TEXT_MATCH depends on FETCH
    const textMatchConnections = layout.connections.filter(
      (conn) => conn.to === "sbe_node_6",
    );
    expect(textMatchConnections.length).toBe(1);
    expect(textMatchConnections[0]?.from).toBe("sbe_node_5");
  });
});
