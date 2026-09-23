import { describe, it, expect } from "vitest";
import { loadSlowQueryLog } from "./parse/loadSlowQueryLog";
import { buildShellCommand } from "./shellCommand";
import { loadSlowQueryLogFixture } from "#test-utils/slow-query-fixtures";

const { entries } = loadSlowQueryLog(
  loadSlowQueryLogFixture("6.0/standalone/slow-queries.jsonl"),
);
const byOp = (op: string) => entries.filter((e) => e.operation === op);

describe("buildShellCommand", () => {
  it("renders finds with their modifiers", () => {
    const find = byOp("find").find((e) => e.command.sort && e.command.limit)!;
    const command = buildShellCommand(find)!;
    expect(command).toMatch(/^db\.getSiblingDB\("shopdb"\)\.orders\.find\(/);
    expect(command).toContain(".sort(");
    expect(command).toContain(".limit(");
    expect(command).not.toContain("lsid");
  });

  it("renders aggregations with their pipeline in shell syntax", () => {
    const aggregate = byOp("aggregate").find((e) =>
      JSON.stringify(e.command).includes('"$date":'),
    )!;
    const command = buildShellCommand(aggregate)!;
    expect(command).toContain(".aggregate([");
    expect(command).toContain("ISODate(");
    expect(command).not.toContain('"$date"');
  });

  it("renders cursor batches through their originating command", () => {
    const batch = byOp("getMore")[0]!;
    expect(buildShellCommand(batch)).toMatch(/\.(find|aggregate)\(/);
  });

  it("renders legacy update and delete logs", () => {
    const legacyDelete = byOp("delete").find((e) =>
      Object.hasOwn(e.command, "q"),
    )!;
    expect(buildShellCommand(legacyDelete)).toContain(".remove(");
    const update = byOp("update").find((e) => e.command.updates)!;
    expect(buildShellCommand(update)).toContain(".update(");
  });

  it("declines inserts and non-query commands", () => {
    expect(buildShellCommand(byOp("insert")[0]!)).toBeUndefined();
    expect(buildShellCommand(byOp("command")[0]!)).toBeUndefined();
  });
});
