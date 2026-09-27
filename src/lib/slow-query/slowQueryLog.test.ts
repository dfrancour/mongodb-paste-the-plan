import { describe, it, expect } from "vitest";
import { loadSlowQueryLog } from "./parse/loadSlowQueryLog";
import { splitRecords } from "./parse/splitRecords";
import {
  getSlowQueryLogFixturePaths,
  loadSlowQueryLogFixture,
} from "#test-utils/slow-query-fixtures";

describe("loadSlowQueryLog across fixtures", () => {
  for (const fixturePath of getSlowQueryLogFixturePaths()) {
    describe(fixturePath, () => {
      const text = loadSlowQueryLogFixture(fixturePath);
      const result = loadSlowQueryLog(text);

      it("turns every record into an entry or a counted skip", () => {
        const records = splitRecords(text).records.length;
        const skipped = Object.values(result.skipped).reduce(
          (a, b) => a + b,
          0,
        );
        expect(result.entries.length + skipped).toBe(records);
        expect(result.entries.length).toBeGreaterThan(0);
        expect(result.invalidLines).toEqual([]);
      });

      it("preserves the raw record and records a duration on every entry", () => {
        for (const entry of result.entries) {
          expect(entry.raw).toBeDefined();
          expect(entry.metrics.durationMillis).toBeTypeOf("number");
          expect(entry.timestamp).toBeInstanceOf(Date);
          expect(entry.namespace).not.toBe("");
        }
      });

      it("assigns sequential ids", () => {
        expect(result.entries.map((e) => e.id)).toEqual(
          result.entries.map((_, i) => i),
        );
      });
    });
  }
});

describe("loadSlowQueryLog on the 6.0 standalone fixture", () => {
  const result = loadSlowQueryLog(
    loadSlowQueryLogFixture("6.0/standalone/slow-queries.jsonl"),
  );
  const byOp = (op: string) => result.entries.filter((e) => e.operation === op);

  it("identifies every operation kind the workload produced", () => {
    const seen = new Set(result.entries.map((e) => e.operation));
    for (const op of [
      "find",
      "aggregate",
      "getMore",
      "count",
      "distinct",
      "findAndModify",
      "update",
      "delete",
      "insert",
      "command",
    ]) {
      expect(seen.has(op as never), op).toBe(true);
    }
  });

  it("maps legacy WRITE-component logs to their operation", () => {
    const legacyDeletes = result.entries.filter(
      (e) => e.operation === "delete" && Object.hasOwn(e.command, "q"),
    );
    expect(legacyDeletes.length).toBeGreaterThan(0);
    expect(legacyDeletes[0]!.namespace).toBe("shopdb.orders");
  });

  it("resolves $cmd namespaces of write commands to their collection", () => {
    expect(result.entries.some((e) => e.namespace.endsWith(".$cmd"))).toBe(
      false,
    );
    const commandDelete = byOp("delete").find((e) => e.command.deletes)!;
    expect(commandDelete.namespace).toBe("shopdb.orders");
  });

  it("resolves cursor batches to their originating operation and shape", () => {
    const batches = byOp("getMore");
    expect(batches.length).toBeGreaterThan(0);
    for (const batch of batches) {
      expect(batch.flags.isCursorBatch).toBe(true);
      expect(batch.originatingCommand).toBeDefined();
      expect(["find", "aggregate"]).toContain(batch.logicalOperation);
    }
    const opener = result.entries.find(
      (e) =>
        e.operation === "find" &&
        batches.some((b) => b.shape.key === e.shape.key),
    );
    expect(opener).toBeDefined();
  });

  it("isolates truncated commands in their own shape", () => {
    const truncated = result.entries.filter((e) => e.flags.isTruncated);
    expect(truncated).toHaveLength(1);
    expect(truncated[0]!.shape.canonical.singletonEntry).toBe(truncated[0]!.id);
  });

  it("strips session noise from commands but keeps query intent", () => {
    const find = byOp("find").find((e) => e.command.filter !== undefined)!;
    expect(find.command.lsid).toBeUndefined();
    expect(find.command.$db).toBeUndefined();
    expect(find.command.filter).toBeDefined();
  });

  it("extracts comments, plan summaries, and plan-cache hashes", () => {
    expect(
      result.entries.some((e) => e.comment === "dashboard:gold-customers"),
    ).toBe(true);
    const collscans = result.entries.filter((e) =>
      e.planSummaryStages.some((s) => s.stage === "COLLSCAN"),
    );
    expect(collscans.length).toBeGreaterThan(0);
    expect(
      result.entries.some((e) => e.planCache.queryHash !== undefined),
    ).toBe(true);
  });

  it("groups the same query shape across different values", () => {
    const byCustomer = byOp("find").filter(
      (e) =>
        e.namespace === "shopdb.orders" &&
        e.shape.summary === "find { customerId }" &&
        e.command.sort,
    );
    expect(byCustomer.length).toBeGreaterThanOrEqual(5);
    expect(new Set(byCustomer.map((e) => e.shape.key)).size).toBe(1);
  });
});

describe("loadSlowQueryLog on 8.0 documentation examples", () => {
  const result = loadSlowQueryLog(
    loadSlowQueryLogFixture("8.0/docs-examples/slow-queries.jsonl"),
  );

  it("reads 8.0-only metrics", () => {
    const [first, second] = result.entries;
    expect(first!.metrics.workingMillis).toBe(89);
    expect(first!.metrics.totalTimeQueuedMicros).toBe(2109);
    expect(first!.metrics.cpuNanos).toBe(20987385);
    expect(first!.planCache.planCacheShapeHash).toBe("9C05019A");
    expect(first!.flags.hasSortStage).toBe(true);
    expect(second!.planCache.queryShapeHash).toBe("5A1C3B2D4E6F7A8B");
    expect(second!.metrics.bytesRead).toBe(52428800);
  });
});

describe("loadSlowQueryLog on mixed log messages", () => {
  it("counts non-slow-query records as skipped", () => {
    const result = loadSlowQueryLog(
      loadSlowQueryLogFixture("6.0/standalone/mixed-messages.jsonl"),
    );
    expect(result.entries).toHaveLength(20);
    expect(result.skipped.notSlowQuery).toBe(40);
  });

  it("counts non-object records", () => {
    const result = loadSlowQueryLog(
      '[1, "x", {"msg":"Slow query","attr":{"command":{"find":"a"},"durationMillis":1,"ns":"db.a"}}]',
    );
    expect(result.skipped.notAnObject).toBe(2);
    expect(result.entries).toHaveLength(1);
  });

  it("counts slow-query lines with mistyped attributes as malformed", () => {
    const result = loadSlowQueryLog(
      '{"msg":"Slow query","attr":{"command":{"find":"a"},"durationMillis":"12","ns":"db.a"}}',
    );
    expect(result.skipped.malformed).toBe(1);
    expect(result.skipped.notSlowQuery).toBe(0);
    expect(result.entries).toHaveLength(0);
  });
});
