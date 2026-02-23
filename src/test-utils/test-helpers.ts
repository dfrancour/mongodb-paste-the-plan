import fs from "fs";
import path from "path";
import type { NormalizedStage, ExplainPlan } from "#types/explain-plan";
import { fixtures, getFixtureKeys } from "#data/fixtures/index";

/**
 * Load a test plan from the fixtures
 */
export function loadTestPlan(planPath: string): ExplainPlan {
  const fixture = fixtures[planPath];
  if (fixture === undefined) {
    throw new Error(`Test plan fixture not found: ${planPath}`);
  }
  return fixture as ExplainPlan;
}

/**
 * Load a test fixture from the src/test-utils/fixtures directory
 */
export function loadTestFixture(fixturePath: string): unknown {
  const fullPath = path.join(
    process.cwd(),
    "src",
    "test-utils",
    "fixtures",
    fixturePath,
  );
  const content = fs.readFileSync(fullPath, "utf-8");
  return JSON.parse(content);
}

/**
 * Get all test plan file paths
 */
export function getAllTestPlanPaths(): string[] {
  return getFixtureKeys();
}

/**
 * Get test plan paths that work with standard query parser (excludes aggregation pipeline files)
 */
export function getStandardQueryPlanPaths(): string[] {
  const allPaths = getAllTestPlanPaths();

  // Filter out aggregation pipeline files that use 'stages' format
  const aggregationFiles = [
    "complex/aggregation-pipeline",
    "complex/lookup-join",
    "complex/unwind-with-group",
  ];

  return allPaths.filter((path) => {
    return !aggregationFiles.some((aggFile) => path.includes(aggFile));
  });
}

/**
 * Find the deepest stages in a normalized plan (for complexity testing)
 */
export function findDeepestStages(stage: NormalizedStage): NormalizedStage[] {
  const allStages: NormalizedStage[] = [];

  function traverse(current: NormalizedStage) {
    allStages.push(current);
    current.children.forEach(traverse);
  }

  traverse(stage);

  const maxDepth = Math.max(...allStages.map((s) => s.depth));
  return allStages.filter((s) => s.depth === maxDepth);
}

/**
 * Check if any node bounding boxes overlap (for layout testing).
 *
 * Uses actual node dimensions and minimum spacing to detect overlap,
 * matching the collision detection logic in the layout engine.
 * Each node can have its own height (matching the engine's dynamic heights).
 */
export function hasOverlappingPositions(
  positions: Array<{ x: number; y: number; height?: number }>,
  nodeSize: { width: number; height: number; minSpacing: number } = {
    width: 300,
    height: 280,
    minSpacing: 40,
  },
): boolean {
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const a = positions[i]!;
      const b = positions[j]!;

      const aHeight = a.height ?? nodeSize.height;
      const bHeight = b.height ?? nodeSize.height;

      const horizontalOverlap =
        a.x < b.x + nodeSize.width + nodeSize.minSpacing &&
        a.x + nodeSize.width + nodeSize.minSpacing > b.x;
      const verticalOverlap =
        a.y < b.y + bHeight + nodeSize.minSpacing &&
        a.y + aHeight + nodeSize.minSpacing > b.y;

      if (horizontalOverlap && verticalOverlap) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Extract stage metrics safely (for type safety testing)
 */
export function extractStageMetrics(stage: unknown): Record<string, unknown> {
  if (!stage || typeof stage !== "object") {
    return {};
  }

  const stageObj = stage as Record<string, unknown>;

  return {
    stage: stageObj.stage,
    nReturned: stageObj.nReturned,
    docsExamined: stageObj.docsExamined,
    keysExamined: stageObj.keysExamined,
    executionTimeMillis: stageObj.executionTimeMillis,
    indexName: stageObj.indexName,
  };
}
