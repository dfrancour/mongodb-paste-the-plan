import { describe, it, expect } from "vitest";
import { sbeAggregationStageSchema } from "./explain-plan";

describe("SBE Aggregation Stage Schema", () => {
  it("should validate $cursor stage correctly", () => {
    const cursorStage = {
      $cursor: {
        queryPlanner: {
          namespace: "airbnb.listingsAndReviews",
        },
        executionStats: {
          nReturned: 2126,
          executionTimeMillis: 6,
          totalKeysExamined: 2143,
          totalDocsExamined: 2126,
        },
      },
      nReturned: 2126,
      executionTimeMillisEstimate: 7,
    };

    const result = sbeAggregationStageSchema.safeParse(cursorStage);
    if (!result.success) {
      console.log("Schema validation errors:", result.error.issues);
    }
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.$cursor?.executionStats?.nReturned).toBe(2126);
      expect(result.data.nReturned).toBe(2126);
    }
  });

  it("should validate $addFields stage correctly", () => {
    const addFieldsStage = {
      $addFields: {
        price_per_guest: { $divide: ["$price", "$accommodates"] },
        has_wifi: { $in: ["Wifi", "$amenities"] },
      },
      nReturned: 2126,
      executionTimeMillisEstimate: 7,
    };

    const result = sbeAggregationStageSchema.safeParse(addFieldsStage);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.$addFields).toBeDefined();
      expect(result.data.nReturned).toBe(2126);
    }
  });

  it("should validate $match stage correctly", () => {
    const matchStage = {
      $match: {
        $and: [{ has_wifi: { $eq: true } }, { amenity_count: { $gte: 5 } }],
      },
      nReturned: 2045,
      executionTimeMillisEstimate: 7,
    };

    const result = sbeAggregationStageSchema.safeParse(matchStage);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.$match).toBeDefined();
      expect(result.data.nReturned).toBe(2045);
    }
  });

  it("should validate $group stage with memory metrics", () => {
    const groupStage = {
      $group: {
        _id: "$address.market",
        avg_price: { $avg: "$price" },
        listing_count: { $sum: 1 },
      },
      maxAccumulatorMemoryUsageBytes: {
        avg_price: 1352,
        listing_count: 1768,
      },
      totalOutputDataSizeBytes: 5757,
      usedDisk: false,
      spills: 0,
      nReturned: 13,
      executionTimeMillisEstimate: 7,
    };

    const result = sbeAggregationStageSchema.safeParse(groupStage);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.$group).toBeDefined();
      expect(result.data.nReturned).toBe(13);
      expect(result.data.maxAccumulatorMemoryUsageBytes).toBeDefined();
    }
  });

  it("should validate $sort stage with limit", () => {
    const sortStage = {
      $sort: {
        sortKey: { listing_count: -1, avg_price: 1 },
        limit: 10,
      },
      totalDataSizeSortedBytesEstimate: 5566,
      usedDisk: false,
      spills: 0,
      nReturned: 10,
      executionTimeMillisEstimate: 7,
    };

    const result = sbeAggregationStageSchema.safeParse(sortStage);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.$sort).toBeDefined();
      expect((result.data.$sort as Record<string, unknown>)?.limit).toBe(10);
      expect(result.data.nReturned).toBe(10);
    }
  });

  it("should handle unknown stage types gracefully", () => {
    const unknownStage = {
      $newAggregationOperator: {
        someField: "someValue",
      },
      nReturned: 100,
      executionTimeMillisEstimate: 5,
      customField: "customValue",
    };

    const result = sbeAggregationStageSchema.safeParse(unknownStage);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nReturned).toBe(100);
      expect(result.data.customField).toBe("customValue");
    }
  });

  it("should handle stages with minimal required fields", () => {
    const minimalStage = {
      $limit: 100,
    };

    const result = sbeAggregationStageSchema.safeParse(minimalStage);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.$limit).toBe(100);
    }
  });

  it("should reject invalid stage structures", () => {
    const invalidStage = "not an object";

    const result = sbeAggregationStageSchema.safeParse(invalidStage);
    expect(result.success).toBe(false);
  });
});
