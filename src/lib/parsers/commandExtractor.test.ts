import { describe, it, expect } from "vitest";
import { CommandExtractor } from "./commandExtractor";
import type { ExplainPlan } from "#types/explain-plan";

describe("CommandExtractor.formatAsCommand", () => {
  it("should format find command with filter, projection, and sort with proper indentation", () => {
    const explainPlan: ExplainPlan = {
      command: {
        find: "listingsAndReviews",
        filter: {
          "host.host_verifications": {
            $in: ["email", "phone"],
          },
          reviews_per_month: {
            $exists: true,
            $ne: null,
          },
        },
        projection: {
          "host.host_name": 1,
          reviews_per_month: 1,
        },
        sort: {
          number_of_reviews: -1,
        },
        $db: "airbnb",
      },
    };

    const queryInfo = CommandExtractor.extractQuery(explainPlan);
    const commandString = CommandExtractor.formatAsCommand(queryInfo);

    // Expected format with proper indentation and parameter comments:
    // db.collection.find(
    //   // filter
    //   { filter },
    //   // projection
    //   { projection }
    // ).sort({ sort })
    const expected = `use airbnb
db.listingsAndReviews.find(
  // filter
  {
    "host.host_verifications": {
      "$in": [
        "email",
        "phone"
      ]
    },
    "reviews_per_month": {
      "$exists": true,
      "$ne": null
    }
  },
  // projection
  {
    "host.host_name": 1,
    "reviews_per_month": 1
  }
).sort({"number_of_reviews":-1})`;

    expect(commandString).toBe(expected);
  });

  it("should format find command with only filter", () => {
    const explainPlan: ExplainPlan = {
      command: {
        find: "users",
        filter: {
          active: true,
        },
        $db: "test",
      },
    };

    const queryInfo = CommandExtractor.extractQuery(explainPlan);
    const commandString = CommandExtractor.formatAsCommand(queryInfo);

    const expected = `use test
db.users.find(
  // filter
  {
    "active": true
  }
)`;

    expect(commandString).toBe(expected);
  });

  it("should format find command with empty filter and projection", () => {
    const explainPlan: ExplainPlan = {
      command: {
        find: "users",
        filter: {},
        projection: {
          name: 1,
          email: 1,
        },
        $db: "test",
      },
    };

    const queryInfo = CommandExtractor.extractQuery(explainPlan);
    const commandString = CommandExtractor.formatAsCommand(queryInfo);

    const expected = `use test
db.users.find(
  // filter
  {},
  // projection
  {
    "name": 1,
    "email": 1
  }
)`;

    expect(commandString).toBe(expected);
  });

  it("should format find command with limit and skip", () => {
    const explainPlan: ExplainPlan = {
      command: {
        find: "products",
        filter: {
          price: { $gt: 100 },
        },
        limit: 10,
        skip: 5,
        $db: "shop",
      },
    };

    const queryInfo = CommandExtractor.extractQuery(explainPlan);
    const commandString = CommandExtractor.formatAsCommand(queryInfo);

    const expected = `use shop
db.products.find(
  // filter
  {
    "price": {
      "$gt": 100
    }
  }
).limit(10).skip(5)`;

    expect(commandString).toBe(expected);
  });

  it("should format aggregate command", () => {
    const explainPlan: ExplainPlan = {
      command: {
        aggregate: "orders",
        pipeline: [
          {
            $match: { status: "pending" },
          },
          {
            $group: {
              _id: "$customerId",
              total: { $sum: "$amount" },
            },
          },
        ],
        $db: "shop",
      },
    };

    const queryInfo = CommandExtractor.extractQuery(explainPlan);
    const commandString = CommandExtractor.formatAsCommand(queryInfo);

    const expected = `use shop
db.orders.aggregate(
  // pipeline
  [
    {
      "$match": {
        "status": "pending"
      }
    },
    {
      "$group": {
        "_id": "$customerId",
        "total": {
          "$sum": "$amount"
        }
      }
    }
  ]
)`;

    expect(commandString).toBe(expected);
  });

  it("should format find command with hint, maxTimeMS, and collation", () => {
    const explainPlan: ExplainPlan = {
      command: {
        find: "listingsAndReviews",
        filter: {
          room_type: "Entire home/apt",
        },
        projection: {
          room_type: 1,
          price: 1,
        },
        hint: "room_type_idx",
        maxTimeMS: 5000,
        collation: {
          locale: "en",
          strength: 2,
        },
        comment: "Test query for command options",
        batchSize: 100,
        limit: 10,
        $db: "airbnb",
      },
    };

    const queryInfo = CommandExtractor.extractQuery(explainPlan);
    const commandString = CommandExtractor.formatAsCommand(queryInfo);

    const expected = `use airbnb
db.listingsAndReviews.find(
  // filter
  {
    "room_type": "Entire home/apt"
  },
  // projection
  {
    "room_type": 1,
    "price": 1
  }
).limit(10).hint("room_type_idx").maxTimeMS(5000).collation({"locale":"en","strength":2}).comment("Test query for command options").batchSize(100)`;

    expect(commandString).toBe(expected);
  });

  it("should extract hint, maxTimeMS, collation from find command", () => {
    const explainPlan: ExplainPlan = {
      command: {
        find: "products",
        filter: { category: "electronics" },
        hint: { category: 1, price: 1 },
        maxTimeMS: 3000,
        collation: { locale: "en_US" },
        comment: "Performance test",
        $db: "shop",
      },
    };

    const queryInfo = CommandExtractor.extractQuery(explainPlan);

    expect(queryInfo.hint).toEqual({ category: 1, price: 1 });
    expect(queryInfo.maxTimeMS).toBe(3000);
    expect(queryInfo.collation).toEqual({ locale: "en_US" });
    expect(queryInfo.comment).toBe("Performance test");
  });

  it("should format aggregate command with allowDiskUse and other options", () => {
    const explainPlan: ExplainPlan = {
      command: {
        aggregate: "orders",
        pipeline: [
          {
            $match: { status: "pending" },
          },
          {
            $group: {
              _id: "$customerId",
              total: { $sum: "$amount" },
            },
          },
        ],
        allowDiskUse: true,
        maxTimeMS: 10000,
        comment: "Large aggregation",
        hint: "status_customer_idx",
        $db: "shop",
      },
    };

    const queryInfo = CommandExtractor.extractQuery(explainPlan);
    const commandString = CommandExtractor.formatAsCommand(queryInfo);

    const expected = `use shop
db.orders.aggregate(
  // pipeline
  [
    {
      "$match": {
        "status": "pending"
      }
    },
    {
      "$group": {
        "_id": "$customerId",
        "total": {
          "$sum": "$amount"
        }
      }
    }
  ]
,
  // options
  {
    hint: "status_customer_idx",
    maxTimeMS: 10000,
    comment: "Large aggregation",
    allowDiskUse: true
  }
)`;

    expect(commandString).toBe(expected);
  });

  it("should extract allowDiskUse from aggregate command", () => {
    const explainPlan: ExplainPlan = {
      command: {
        aggregate: "sales",
        pipeline: [{ $sort: { date: -1 } }],
        allowDiskUse: true,
        maxTimeMS: 5000,
        $db: "analytics",
      },
    };

    const queryInfo = CommandExtractor.extractQuery(explainPlan);

    expect(queryInfo.allowDiskUse).toBe(true);
    expect(queryInfo.maxTimeMS).toBe(5000);
  });

  it("should handle readConcern and readPreference options", () => {
    const explainPlan: ExplainPlan = {
      command: {
        find: "users",
        filter: { active: true },
        readConcern: { level: "majority" },
        readPreference: { mode: "secondary" },
        $db: "test",
      },
    };

    const queryInfo = CommandExtractor.extractQuery(explainPlan);
    const commandString = CommandExtractor.formatAsCommand(queryInfo);

    expect(queryInfo.readConcern).toEqual({ level: "majority" });
    expect(queryInfo.readPreference).toEqual({ mode: "secondary" });
    expect(commandString).toContain("use test");
    expect(commandString).toContain('.readConcern({"level":"majority"})');
    expect(commandString).toContain('.readPreference({"mode":"secondary"})');
  });
});
