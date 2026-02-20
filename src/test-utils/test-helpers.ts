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
 * Check if any positions overlap (for layout testing)
 */
export function hasOverlappingPositions(
  positions: Array<{ x: number; y: number }>,
  tolerance = 5,
): boolean {
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const pos1 = positions[i]!;
      const pos2 = positions[j]!;

      const xOverlap = Math.abs(pos1.x - pos2.x) < tolerance;
      const yOverlap = Math.abs(pos1.y - pos2.y) < tolerance;

      if (xOverlap && yOverlap) {
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
