import fs from "fs";
import path from "path";

const FIXTURES_DIR = path.join(
  process.cwd(),
  "src",
  "test-utils",
  "fixtures",
  "slow-query-logs",
);

/** Read a slow-query log fixture as text, e.g. `6.0/standalone/slow-queries.jsonl`. */
export function loadSlowQueryLogFixture(relativePath: string): string {
  return fs.readFileSync(path.join(FIXTURES_DIR, relativePath), "utf-8");
}

/** Every `slow-queries.jsonl` fixture, as paths relative to the fixtures dir. */
export function getSlowQueryLogFixturePaths(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (name === "slow-queries.jsonl")
        found.push(path.relative(FIXTURES_DIR, full));
    }
  };
  walk(FIXTURES_DIR);
  return found.sort();
}
