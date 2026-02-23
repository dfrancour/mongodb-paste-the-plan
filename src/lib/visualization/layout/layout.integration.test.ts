import { describe, it, expect } from "vitest";
import { parsePlan } from "#lib/parsers";
import { runAllAnalyzers } from "#lib/analyzers";
import {
  loadTestPlan,
  getAllTestPlanPaths,
  getStandardQueryPlanPaths,
  hasOverlappingPositions,
} from "#test-utils/test-helpers";
import {
  calculateLayout,
  transformToFlowStages,
  DEFAULT_LAYOUT_CONFIG,
} from "./index";
import type { LayoutConfig } from "./config";
import type { NormalizedStage } from "#types/explain-plan";
import { FlowNodeLogic } from "../flowNodeLogic";

/**
 * Helper: parse a test plan and return the root stage (execution if available, plan otherwise)
 */
function parseAndNormalize(planPath: string): {
  rootStage: NormalizedStage;
  planMode: "plan" | "execution";
  raw: ReturnType<typeof parsePlan>["raw"];
} {
  const plan = loadTestPlan(planPath);
  const parsed = parsePlan(plan);
  const rootStage = parsed.execution ?? parsed.plan;
  return { rootStage, planMode: parsed.planMode, raw: parsed.raw };
}

// ============================================================================
// Universal constraints — all fixtures
// ============================================================================

describe("Layout Integration: Universal Constraints", () => {
  const allPlanPaths = getAllTestPlanPaths();

  it("should produce a valid layout for every fixture", () => {
    allPlanPaths.forEach((planPath) => {
      const { rootStage, planMode } = parseAndNormalize(planPath);
      const layout = calculateLayout(rootStage, planMode);

      expect(layout.nodes.size, `${planPath}: nodes.size > 0`).toBeGreaterThan(
        0,
      );
      expect(layout.dimensions.width, `${planPath}: width > 0`).toBeGreaterThan(
        0,
      );
      expect(
        layout.dimensions.height,
        `${planPath}: height > 0`,
      ).toBeGreaterThan(0);
    });
  });

  it("should assign a position for every stage in the tree", () => {
    allPlanPaths.forEach((planPath) => {
      const { rootStage, planMode } = parseAndNormalize(planPath);
      const layout = calculateLayout(rootStage, planMode);

      const countStages = (stage: NormalizedStage): number =>
        1 + stage.children.reduce((sum, c) => sum + countStages(c), 0);
      const totalStages = countStages(rootStage);

      expect(
        layout.nodes.size,
        `${planPath}: node count matches stage count`,
      ).toBe(totalStages);
    });
  });

  it("should produce no overlapping node positions", () => {
    const standardPaths = getStandardQueryPlanPaths();
    standardPaths.forEach((planPath) => {
      const { rootStage, planMode } = parseAndNormalize(planPath);
      const layout = calculateLayout(rootStage, planMode);

      // Build per-node heights matching what the engine uses
      const stageHeights = new Map<string, number>();
      const collectHeights = (stage: NormalizedStage) => {
        stageHeights.set(
          stage.id,
          FlowNodeLogic.calculateNodeHeight(stage, planMode),
        );
        stage.children.forEach(collectHeights);
      };
      collectHeights(rootStage);

      const positions = Array.from(layout.nodes.entries()).map(
        ([stageId, p]) => ({
          x: p.x,
          y: p.y,
          height: stageHeights.get(stageId),
        }),
      );

      expect(
        hasOverlappingPositions(positions),
        `${planPath}: no overlapping positions`,
      ).toBe(false);
    });
  });

  it("should reference valid stage IDs in all connections", () => {
    allPlanPaths.forEach((planPath) => {
      const { rootStage, planMode } = parseAndNormalize(planPath);
      const layout = calculateLayout(rootStage, planMode);

      layout.connections.forEach((conn) => {
        expect(
          layout.nodes.has(conn.from),
          `${planPath}: connection.from '${conn.from}' exists in nodes`,
        ).toBe(true);
        expect(
          layout.nodes.has(conn.to),
          `${planPath}: connection.to '${conn.to}' exists in nodes`,
        ).toBe(true);
      });
    });
  });

  it("should be deterministic across repeated calls", () => {
    const standardPaths = getStandardQueryPlanPaths();
    standardPaths.forEach((planPath) => {
      const { rootStage, planMode } = parseAndNormalize(planPath);

      const layout1 = calculateLayout(rootStage, planMode);
      const layout2 = calculateLayout(rootStage, planMode);

      layout1.nodes.forEach((pos1, stageId) => {
        const pos2 = layout2.nodes.get(stageId);
        expect(pos1.x, `${planPath}/${stageId}: deterministic x`).toBe(pos2?.x);
        expect(pos1.y, `${planPath}/${stageId}: deterministic y`).toBe(pos2?.y);
      });
    });
  });
});

// ============================================================================
// Behavioral invariants — selected fixtures
// ============================================================================

describe("Layout Integration: Behavioral Invariants", () => {
  const standardPaths = getStandardQueryPlanPaths();

  it("should position root above all descendants (monotonically increasing Y with depth)", () => {
    standardPaths.forEach((planPath) => {
      const { rootStage, planMode } = parseAndNormalize(planPath);
      const layout = calculateLayout(rootStage, planMode);

      const rootPosition = layout.nodes.get(rootStage.id);
      expect(rootPosition, `${planPath}: root has position`).toBeDefined();

      layout.nodes.forEach((pos, stageId) => {
        if (stageId !== rootStage.id) {
          expect(
            pos.y,
            `${planPath}/${stageId}: y >= root y`,
          ).toBeGreaterThanOrEqual(rootPosition!.y);
        }
      });
    });
  });

  it("should increase Y with increasing level", () => {
    standardPaths.forEach((planPath) => {
      const { rootStage, planMode } = parseAndNormalize(planPath);
      const layout = calculateLayout(rootStage, planMode);

      // Group by level, check that level N+1 has y >= level N
      const levelYs = new Map<number, number[]>();
      layout.nodes.forEach((pos) => {
        if (!levelYs.has(pos.level)) {
          levelYs.set(pos.level, []);
        }
        levelYs.get(pos.level)!.push(pos.y);
      });

      const levels = Array.from(levelYs.keys()).sort((a, b) => a - b);
      for (let i = 1; i < levels.length; i++) {
        const prevMin = Math.min(...levelYs.get(levels[i - 1]!)!);
        const currMin = Math.min(...levelYs.get(levels[i]!)!);
        expect(
          currMin,
          `${planPath}: level ${levels[i]} y >= level ${levels[i - 1]} y`,
        ).toBeGreaterThanOrEqual(prevMin);
      }
    });
  });

  it("should produce connections count == total nodes - 1 (tree invariant)", () => {
    standardPaths.forEach((planPath) => {
      const { rootStage, planMode } = parseAndNormalize(planPath);
      const layout = calculateLayout(rootStage, planMode);

      expect(
        layout.connections.length,
        `${planPath}: connections == nodes - 1`,
      ).toBe(layout.nodes.size - 1);
    });
  });

  it("should contain all node positions within dimensions", () => {
    standardPaths.forEach((planPath) => {
      const { rootStage, planMode } = parseAndNormalize(planPath);
      const layout = calculateLayout(rootStage, planMode);

      // Find bounding box of all nodes
      let minX = Infinity;
      let maxX = -Infinity;
      layout.nodes.forEach((pos) => {
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x + DEFAULT_LAYOUT_CONFIG.nodeWidth);
      });

      const spanWidth =
        maxX - minX + DEFAULT_LAYOUT_CONFIG.containerPadding * 2;
      expect(
        layout.dimensions.width,
        `${planPath}: dimensions.width >= span`,
      ).toBeGreaterThanOrEqual(spanWidth);
    });
  });

  it("should maintain vertical clearance between adjacent levels", () => {
    standardPaths.forEach((planPath) => {
      const { rootStage, planMode } = parseAndNormalize(planPath);
      const layout = calculateLayout(rootStage, planMode);

      const stageHeights = new Map<string, number>();
      const collectHeights = (stage: NormalizedStage) => {
        stageHeights.set(
          stage.id,
          FlowNodeLogic.calculateNodeHeight(stage, planMode),
        );
        stage.children.forEach(collectHeights);
      };
      collectHeights(rootStage);

      // For every parent-child pair at the same X, verify no vertical overlap
      const checkVerticalClearance = (stage: NormalizedStage) => {
        const parentPos = layout.nodes.get(stage.id);
        const parentHeight = stageHeights.get(stage.id) ?? 0;
        if (!parentPos) return;

        stage.children.forEach((child) => {
          const childPos = layout.nodes.get(child.id);
          if (!childPos) return;

          // Only check pairs that could vertically overlap (horizontally close)
          const horizontallyClose =
            parentPos.x <
              childPos.x +
                DEFAULT_LAYOUT_CONFIG.nodeWidth +
                DEFAULT_LAYOUT_CONFIG.minNodeSpacing &&
            parentPos.x +
              DEFAULT_LAYOUT_CONFIG.nodeWidth +
              DEFAULT_LAYOUT_CONFIG.minNodeSpacing >
              childPos.x;

          if (horizontallyClose) {
            const gap = childPos.y - (parentPos.y + parentHeight);
            expect(
              gap,
              `${planPath}: ${stage.id} → ${child.id} vertical gap (${gap}px) >= minNodeSpacing`,
            ).toBeGreaterThanOrEqual(DEFAULT_LAYOUT_CONFIG.minNodeSpacing);
          }

          checkVerticalClearance(child);
        });
      };
      checkVerticalClearance(rootStage);
    });
  });
});

// ============================================================================
// Measured heights (DOM re-layout simulation)
// ============================================================================

describe("Layout Integration: Measured Heights Override", () => {
  const standardPaths = getStandardQueryPlanPaths();

  /**
   * Simulate DOM-measured heights that are taller than estimates.
   * This reproduces the real-world scenario: FlowNodeLogic estimates are
   * heuristic and often undercount, so the browser renders taller nodes.
   * The layout must still have no overlaps when re-calculated with these
   * larger heights.
   */
  function buildInflatedHeights(
    rootStage: NormalizedStage,
    planMode: "plan" | "execution",
    inflationFactor: number,
  ): Map<string, number> {
    const measured = new Map<string, number>();
    const collect = (stage: NormalizedStage) => {
      const estimated = FlowNodeLogic.calculateNodeHeight(stage, planMode);
      measured.set(stage.id, Math.ceil(estimated * inflationFactor));
      stage.children.forEach(collect);
    };
    collect(rootStage);
    return measured;
  }

  it("should produce no overlapping positions when DOM heights exceed estimates by 30%", () => {
    standardPaths.forEach((planPath) => {
      const { rootStage, planMode } = parseAndNormalize(planPath);
      const inflated = buildInflatedHeights(rootStage, planMode, 1.3);
      const layout = calculateLayout(
        rootStage,
        planMode,
        DEFAULT_LAYOUT_CONFIG,
        inflated,
      );

      const positions = Array.from(layout.nodes.entries()).map(
        ([stageId, p]) => ({
          x: p.x,
          y: p.y,
          height: inflated.get(stageId),
        }),
      );

      expect(
        hasOverlappingPositions(positions),
        `${planPath}: no overlaps with 30% inflated heights`,
      ).toBe(false);
    });
  });

  it("should maintain vertical clearance with inflated measured heights", () => {
    standardPaths.forEach((planPath) => {
      const { rootStage, planMode } = parseAndNormalize(planPath);
      const inflated = buildInflatedHeights(rootStage, planMode, 1.3);
      const layout = calculateLayout(
        rootStage,
        planMode,
        DEFAULT_LAYOUT_CONFIG,
        inflated,
      );

      const checkVerticalClearance = (stage: NormalizedStage) => {
        const parentPos = layout.nodes.get(stage.id);
        const parentHeight = inflated.get(stage.id) ?? 0;
        if (!parentPos) return;

        stage.children.forEach((child) => {
          const childPos = layout.nodes.get(child.id);
          if (!childPos) return;

          const horizontallyClose =
            parentPos.x <
              childPos.x +
                DEFAULT_LAYOUT_CONFIG.nodeWidth +
                DEFAULT_LAYOUT_CONFIG.minNodeSpacing &&
            parentPos.x +
              DEFAULT_LAYOUT_CONFIG.nodeWidth +
              DEFAULT_LAYOUT_CONFIG.minNodeSpacing >
              childPos.x;

          if (horizontallyClose) {
            const gap = childPos.y - (parentPos.y + parentHeight);
            expect(
              gap,
              `${planPath}: ${stage.id} → ${child.id} vertical gap (${gap}px) >= minNodeSpacing with inflated heights`,
            ).toBeGreaterThanOrEqual(DEFAULT_LAYOUT_CONFIG.minNodeSpacing);
          }

          checkVerticalClearance(child);
        });
      };
      checkVerticalClearance(rootStage);
    });
  });

  it("should produce larger dimensions when measured heights are larger", () => {
    standardPaths.forEach((planPath) => {
      const { rootStage, planMode } = parseAndNormalize(planPath);

      const estimatedLayout = calculateLayout(rootStage, planMode);
      const inflated = buildInflatedHeights(rootStage, planMode, 1.5);
      const measuredLayout = calculateLayout(
        rootStage,
        planMode,
        DEFAULT_LAYOUT_CONFIG,
        inflated,
      );

      expect(
        measuredLayout.dimensions.height,
        `${planPath}: measured layout height >= estimated layout height`,
      ).toBeGreaterThanOrEqual(estimatedLayout.dimensions.height);
    });
  });

  it("should be deterministic with the same measured heights", () => {
    const planPath = standardPaths[0]!;
    const { rootStage, planMode } = parseAndNormalize(planPath);
    const inflated = buildInflatedHeights(rootStage, planMode, 1.3);

    const layout1 = calculateLayout(
      rootStage,
      planMode,
      DEFAULT_LAYOUT_CONFIG,
      inflated,
    );
    const layout2 = calculateLayout(
      rootStage,
      planMode,
      DEFAULT_LAYOUT_CONFIG,
      inflated,
    );

    layout1.nodes.forEach((pos1, stageId) => {
      const pos2 = layout2.nodes.get(stageId);
      expect(pos1.x, `${stageId}: deterministic x`).toBe(pos2?.x);
      expect(pos1.y, `${stageId}: deterministic y`).toBe(pos2?.y);
    });
  });
});

// ============================================================================
// Config override
// ============================================================================

describe("Layout Integration: Config Override", () => {
  it("should produce wider spacing with doubled config", () => {
    const { rootStage, planMode } = parseAndNormalize(
      getStandardQueryPlanPaths()[0]!,
    );

    const defaultLayout = calculateLayout(rootStage, planMode);

    const wideConfig: LayoutConfig = {
      ...DEFAULT_LAYOUT_CONFIG,
      horizontalSpacing: DEFAULT_LAYOUT_CONFIG.horizontalSpacing * 2,
      verticalSpacing: DEFAULT_LAYOUT_CONFIG.verticalSpacing * 2,
    };
    const wideLayout = calculateLayout(rootStage, planMode, wideConfig);

    // With wider spacing, the overall dimensions should be >= the default
    if (defaultLayout.nodes.size > 1) {
      expect(wideLayout.dimensions.width).toBeGreaterThanOrEqual(
        defaultLayout.dimensions.width,
      );
    }
  });

  it("should produce narrower layout with reduced nodeWidth", () => {
    const { rootStage, planMode } = parseAndNormalize(
      getStandardQueryPlanPaths()[0]!,
    );

    const narrowConfig: LayoutConfig = {
      ...DEFAULT_LAYOUT_CONFIG,
      nodeWidth: DEFAULT_LAYOUT_CONFIG.nodeWidth / 2,
    };
    const narrowLayout = calculateLayout(rootStage, planMode, narrowConfig);
    const defaultLayout = calculateLayout(rootStage, planMode);

    if (defaultLayout.nodes.size > 1) {
      expect(narrowLayout.dimensions.width).toBeLessThanOrEqual(
        defaultLayout.dimensions.width,
      );
    }
  });
});

// ============================================================================
// Stage transformation
// ============================================================================

describe("Layout Integration: Stage Transformation", () => {
  it("should produce FlowStages with position, connections, and visualization", () => {
    const standardPaths = getStandardQueryPlanPaths();
    standardPaths.forEach((planPath) => {
      const { rootStage, planMode, raw } = parseAndNormalize(planPath);
      const layout = calculateLayout(rootStage, planMode);
      const analysisResults = runAllAnalyzers({
        explainPlan: raw,
        rootStage,
      });
      const flowStages = transformToFlowStages(
        rootStage,
        layout,
        analysisResults,
      );

      expect(flowStages.length, `${planPath}: has flow stages`).toBeGreaterThan(
        0,
      );

      flowStages.forEach((stage) => {
        expect(
          stage.position,
          `${planPath}/${stage.id}: has position`,
        ).toBeDefined();
        expect(
          stage.connections,
          `${planPath}/${stage.id}: has connections`,
        ).toBeDefined();
        expect(
          stage.visualization,
          `${planPath}/${stage.id}: has visualization`,
        ).toBeDefined();
        expect(
          stage.visualization.performanceLevel,
          `${planPath}/${stage.id}: has performanceLevel`,
        ).toBeDefined();
      });
    });
  });

  it("should produce at least one warning or critical finding for performance plans", () => {
    const performancePlanPaths = getStandardQueryPlanPaths().filter(
      (p) =>
        (p.includes("inefficient") || p.includes("sort-without-index")) &&
        (p.includes("executionStats") || p.includes("allPlansExecution")),
    );

    performancePlanPaths.forEach((planPath) => {
      const { rootStage, planMode, raw } = parseAndNormalize(planPath);
      const layout = calculateLayout(rootStage, planMode);
      const analysisResults = runAllAnalyzers({
        explainPlan: raw,
        rootStage,
      });
      const flowStages = transformToFlowStages(
        rootStage,
        layout,
        analysisResults,
      );

      const hasWarningOrCritical = flowStages.some(
        (s) =>
          s.visualization.performanceLevel === "warning" ||
          s.visualization.performanceLevel === "critical",
      );

      expect(
        hasWarningOrCritical,
        `${planPath}: should have at least one warning/critical stage`,
      ).toBe(true);
    });
  });
});
