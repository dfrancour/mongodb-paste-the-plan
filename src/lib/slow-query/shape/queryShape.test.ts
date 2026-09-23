import { describe, it, expect } from "vitest";
import { buildQueryShape, type ShapeInput } from "./queryShape";

function shapeOf(
  command: Record<string, unknown>,
  overrides: Partial<ShapeInput> = {},
) {
  return buildQueryShape({
    command,
    operation: "find",
    commandName: "find",
    namespace: "shop.orders",
    entryId: 0,
    singleton: false,
    ...overrides,
  });
}

describe("buildQueryShape", () => {
  it("shapes non-query commands on their name alone", () => {
    const a = shapeOf(
      { createIndexes: "orders", indexes: [{ key: { a: 1 }, name: "a_1" }] },
      { operation: "command", commandName: "createIndexes" },
    );
    const b = shapeOf(
      { createIndexes: "orders", indexes: [{ key: { b: 1 }, name: "b_1" }] },
      { operation: "command", commandName: "createIndexes" },
    );
    const c = shapeOf(
      { collStats: "orders" },
      { operation: "command", commandName: "collStats" },
    );
    expect(a.key).toBe(b.key);
    expect(a.key).not.toBe(c.key);
  });

  it("ignores literal values", () => {
    const a = shapeOf({ find: "orders", filter: { customerId: 42 } });
    const b = shapeOf({ find: "orders", filter: { customerId: 4999 } });
    expect(a.key).toBe(b.key);
  });

  it("distinguishes value types", () => {
    const a = shapeOf({ find: "orders", filter: { customerId: 42 } });
    const b = shapeOf({ find: "orders", filter: { customerId: "42" } });
    expect(a.key).not.toBe(b.key);
  });

  it("distinguishes operators", () => {
    const a = shapeOf({ find: "orders", filter: { total: { $gt: 1 } } });
    const b = shapeOf({ find: "orders", filter: { total: { $lt: 1 } } });
    expect(a.key).not.toBe(b.key);
  });

  it("ignores predicate key order and $or branch order", () => {
    const a = shapeOf({
      find: "orders",
      filter: { $or: [{ a: 1 }, { b: 2 }], c: 3 },
    });
    const b = shapeOf({
      find: "orders",
      filter: { c: 9, $or: [{ b: 7 }, { a: 8 }] },
    });
    expect(a.key).toBe(b.key);
  });

  it("keeps sort order significant", () => {
    const a = shapeOf({ find: "orders", sort: { a: 1, b: -1 } });
    const b = shapeOf({ find: "orders", sort: { b: -1, a: 1 } });
    expect(a.key).not.toBe(b.key);
  });

  it("keeps regexes exact", () => {
    const a = shapeOf({
      find: "orders",
      filter: { region: { $regex: "^eu" } },
    });
    const b = shapeOf({
      find: "orders",
      filter: { region: { $regex: "^us" } },
    });
    expect(a.key).not.toBe(b.key);
  });

  it("ignores per-request options and tokenizes the rest", () => {
    const a = shapeOf({
      find: "orders",
      filter: { status: "paid" },
      limit: 10,
      batchSize: 500,
      maxTimeMS: 100,
      txnNumber: 1,
      readConcern: {
        level: "majority",
        afterClusterTime: { $timestamp: { t: 1, i: 1 } },
      },
    });
    const b = shapeOf({
      find: "orders",
      filter: { status: "shipped" },
      limit: 20,
      batchSize: 1000,
      maxTimeMS: 200,
      txnNumber: 2,
      readConcern: {
        level: "majority",
        afterClusterTime: { $timestamp: { t: 2, i: 1 } },
      },
    });
    const unlimited = shapeOf({ find: "orders", filter: { status: "paid" } });
    expect(a.key).toBe(b.key);
    expect(a.key).not.toBe(unlimited.key);
    expect(a.canonical.options).toEqual({
      limit: "?number",
      readConcern: {
        $document: [
          ["level", "?string"],
          ["afterClusterTime", "?timestamp"],
        ],
      },
    });
  });

  it("merges $in lists of different lengths and $text terms", () => {
    const a = shapeOf({
      find: "orders",
      filter: { region: { $in: ["us", "eu"] } },
    });
    const b = shapeOf({
      find: "orders",
      filter: { region: { $in: ["us", "eu", "apac"] } },
    });
    const mixed = shapeOf({
      find: "orders",
      filter: { region: { $in: ["us", 1] } },
    });
    expect(a.key).toBe(b.key);
    expect(a.key).not.toBe(mixed.key);
    const text = (term: string) =>
      shapeOf({ find: "orders", filter: { $text: { $search: term } } }).key;
    expect(text("foo")).toBe(text("bar"));
  });

  it("canonicalizes pipelines stage by stage", () => {
    const pipeline = (status: string, limit: number) => [
      { $match: { status } },
      { $group: { _id: "$region", n: { $sum: 1 } } },
      { $limit: limit },
    ];
    const a = shapeOf(
      { aggregate: "orders", pipeline: pipeline("paid", 5) },
      { operation: "aggregate" },
    );
    const b = shapeOf(
      { aggregate: "orders", pipeline: pipeline("shipped", 5) },
      { operation: "aggregate" },
    );
    const c = shapeOf(
      { aggregate: "orders", pipeline: pipeline("paid", 10) },
      { operation: "aggregate" },
    );
    expect(a.key).toBe(b.key);
    expect(a.key).not.toBe(c.key); // limits stay exact
  });

  it("canonicalizes update statements", () => {
    const a = shapeOf(
      {
        update: "orders",
        updates: [{ q: { customerId: 1 }, u: { $set: { note: "a" } } }],
      },
      { operation: "update" },
    );
    const b = shapeOf(
      {
        update: "orders",
        updates: [{ q: { customerId: 2 }, u: { $set: { note: "b" } } }],
      },
      { operation: "update" },
    );
    expect(a.key).toBe(b.key);
  });

  it("never merges singleton entries", () => {
    const a = shapeOf({ find: "orders" }, { singleton: true, entryId: 1 });
    const b = shapeOf({ find: "orders" }, { singleton: true, entryId: 2 });
    expect(a.key).not.toBe(b.key);
  });

  it("summarizes shapes by pipeline stages or predicate keys", () => {
    const shape = shapeOf(
      { aggregate: "orders", pipeline: [{ $match: {} }, { $group: {} }] },
      { operation: "aggregate" },
    );
    expect(shape.summary).toBe("$match → $group");
    expect(shapeOf({ find: "orders", filter: { a: 1, b: 2 } }).summary).toBe(
      "find { a, b }",
    );
  });
});
