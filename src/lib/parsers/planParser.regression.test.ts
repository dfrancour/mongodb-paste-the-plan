import { describe, it, expect } from "vitest";
import { parsePlan } from "#lib/parsers";
import {
  loadAllValidationPlanPaths,
  loadValidationPlan,
  parseValidationPlanPath,
} from "#test-utils/test-helpers";

/**
 * Regression smoke tests using bulk-generated validation plans.
 *
 * Runs every explain plan from the validation-plans corpus through parsePlan()
 * to ensure the parser handles real MongoDB output across versions 6.0–8.0,
 * single-node and sharded topologies, and all query types without throwing.
 */

const allPaths = loadAllValidationPlanPaths();

// Group paths by version > topology > queryType
const grouped = new Map<string, Map<string, Map<string, string[]>>>();

for (const p of allPaths) {
  const { version, topology, queryType } = parseValidationPlanPath(p);

  if (!grouped.has(version)) grouped.set(version, new Map());
  const topoMap = grouped.get(version)!;

  if (!topoMap.has(topology)) topoMap.set(topology, new Map());
  const typeMap = topoMap.get(topology)!;

  if (!typeMap.has(queryType)) typeMap.set(queryType, []);
  typeMap.get(queryType)!.push(p);
}

describe("Validation Plan Regression", () => {
  it(`discovers ${allPaths.length} validation plans`, () => {
    expect(allPaths.length).toBeGreaterThan(700);
  });

  for (const [version, topoMap] of [...grouped.entries()].sort()) {
    describe(version, () => {
      for (const [topology, typeMap] of [...topoMap.entries()].sort()) {
        describe(topology, () => {
          for (const [queryType, paths] of [...typeMap.entries()].sort()) {
            describe(queryType, () => {
              it.each(paths.map((p) => [p]))("%s", (planPath) => {
                const raw = loadValidationPlan(planPath);
                expect(() => parsePlan(raw)).not.toThrow();
              });
            });
          }
        });
      }
    });
  }
});
