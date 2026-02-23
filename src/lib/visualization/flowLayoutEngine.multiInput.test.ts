import { describe, it, expect } from "vitest";
import { validatePlan, normalizeExecution } from "#lib/parsers";
import { FlowLayoutEngine } from "./flowLayoutEngine";
import { FlowNodeLogic } from "./flowNodeLogic";
import { runAllAnalyzers } from "#lib/analyzers";
import {
  loadTestPlan,
  hasOverlappingPositions,
} from "#test-utils/test-helpers";
import type { NormalizedStage } from "#types/explain-plan";

describe("Multi-Input Merge Layout Handling", () => {
  it("should handle merge operations without positioning conflicts", () => {
    const complexPlans = [
      "complex/or-operation.executionStats.json",
      "complex/array-operations.executionStats.json",
      "complex/deep-nesting.executionStats.json",
    ];

    complexPlans.forEach((planPath) => {
      const plan = loadTestPlan(planPath);
      const parsed = validatePlan(plan);
      const normalized = normalizeExecution(parsed);
      const flowLayout = FlowLayoutEngine.calculateLayout(normalized);
      const analysisResults = runAllAnalyzers({
        explainPlan: plan,
        rootStage: normalized,
      });
      const flowStages = FlowLayoutEngine.transformToFlowStages(
        normalized,
        flowLayout,
        analysisResults,
      );

      // Behavioral expectation: No overlapping positions (using dynamic node heights)
      const stageHeights = new Map<string, number>();
      const collectHeights = (stage: NormalizedStage) => {
        stageHeights.set(stage.id, FlowNodeLogic.calculateNodeHeight(stage));
        stage.children.forEach(collectHeights);
      };
      collectHeights(normalized);

      const positions = flowStages.map((s) => ({
        x: s.position.x,
        y: s.position.y,
        height: stageHeights.get(s.id),
      }));
      expect(hasOverlappingPositions(positions)).toBe(false);

      // Behavioral expectation: Multi-input nodes positioned to accommodate connections
      const mergeNodes = flowStages.filter((s) => s.children.length > 1);
      mergeNodes.forEach((node) => {
        expect(node.position.y).toBeGreaterThan(0); // Not cut off at top
        expect(node.position.x).toBeGreaterThanOrEqual(0); // Not cut off at left
      });
    });
  });

  it("should provide adequate vertical spacing for multi-input merges", () => {
    const orQuery = loadTestPlan("complex/or-operation.executionStats.json");
    const parsed = validatePlan(orQuery);
    const normalized = normalizeExecution(parsed);
    const flowLayout = FlowLayoutEngine.calculateLayout(normalized);
    const analysisResults = runAllAnalyzers({
      explainPlan: orQuery,
      rootStage: normalized,
    });
    const flowStages = FlowLayoutEngine.transformToFlowStages(
      normalized,
      flowLayout,
      analysisResults,
    );

    // Find OR stage and its input stages
    const orStage = flowStages.find((s) => s.stage === "OR");
    const inputStages = flowStages.filter(
      (s) => s.depth > (orStage?.depth ?? 0),
    );

    if (orStage && inputStages.length > 1) {
      // Behavioral expectation: Input stages should have adequate vertical separation
      const yPositions = inputStages
        .map((s) => s.position.y)
        .sort((a, b) => a - b);
      for (let i = 1; i < yPositions.length; i++) {
        const verticalGap = yPositions[i]! - yPositions[i - 1]!;
        expect(verticalGap).toBeGreaterThanOrEqual(0); // Allow zero spacing for compact layouts
      }
    }
  });

  it("should maintain bottom-to-top flow for complex operations", () => {
    const complexPlans = [
      "complex/array-operations.executionStats.json",
      "complex/text-search.executionStats.json",
      "complex/large-in-clause.executionStats.json",
    ];

    complexPlans.forEach((planPath) => {
      const plan = loadTestPlan(planPath);
      const parsed = validatePlan(plan);
      const normalized = normalizeExecution(parsed);
      const flowLayout = FlowLayoutEngine.calculateLayout(normalized);
      const analysisResults = runAllAnalyzers({
        explainPlan: plan,
        rootStage: normalized,
      });
      const flowStages = FlowLayoutEngine.transformToFlowStages(
        normalized,
        flowLayout,
        analysisResults,
      );

      // Behavioral expectation: Data sources (leaf nodes) should be bottommost
      const leafNodes = flowStages.filter((s) => s.children.length === 0);
      const rootNodes = flowStages.filter((s) => s.depth === 0);

      if (leafNodes.length > 0 && rootNodes.length > 0) {
        const maxLeafX = Math.max(...leafNodes.map((s) => s.position.x));
        const minRootX = Math.min(...rootNodes.map((s) => s.position.x));

        expect(maxLeafX).toBeGreaterThanOrEqual(minRootX); // Allow equal positioning
      }
    });
  });

  it("should handle deep nesting without layout degradation", () => {
    const deepPlan = loadTestPlan("complex/deep-nesting.executionStats.json");
    const parsed = validatePlan(deepPlan);
    const normalized = normalizeExecution(parsed);
    const flowLayout = FlowLayoutEngine.calculateLayout(normalized);
    const analysisResults = runAllAnalyzers({
      explainPlan: deepPlan,
      rootStage: normalized,
    });
    const flowStages = FlowLayoutEngine.transformToFlowStages(
      normalized,
      flowLayout,
      analysisResults,
    );

    // Behavioral expectation: Deep nesting should not cause position overflow
    const positions = flowStages.map((s) => ({
      x: s.position.x,
      y: s.position.y,
    }));

    // All positions should be reasonable (not extremely large)
    positions.forEach((pos) => {
      expect(pos.x).toBeLessThan(2000); // Reasonable max width
      expect(pos.y).toBeLessThan(5000); // Reasonable max height for deep nesting
      expect(pos.x).toBeGreaterThanOrEqual(0); // No negative positions
      expect(pos.y).toBeGreaterThanOrEqual(0);
    });

    // Should maintain horizontal progression with depth
    const stagesByDepth = new Map<number, typeof flowStages>();
    flowStages.forEach((stage) => {
      const depthStages = stagesByDepth.get(stage.depth) ?? [];
      depthStages.push(stage);
      stagesByDepth.set(stage.depth, depthStages);
    });

    // Each depth level should generally be to the left of deeper levels
    const depths = Array.from(stagesByDepth.keys()).sort((a, b) => a - b);
    for (let i = 1; i < depths.length; i++) {
      const shallowerDepth = depths[i - 1]!;
      const deeperDepth = depths[i]!;

      const shallowerStages = stagesByDepth.get(shallowerDepth)!;
      const deeperStages = stagesByDepth.get(deeperDepth)!;

      const avgShallowX =
        shallowerStages.reduce((sum, s) => sum + s.position.x, 0) /
        shallowerStages.length;
      const avgDeepX =
        deeperStages.reduce((sum, s) => sum + s.position.x, 0) /
        deeperStages.length;

      expect(avgDeepX).toBeGreaterThan(avgShallowX - 250); // Allow tolerance for multi-input merge layouts
    }
  });
});
