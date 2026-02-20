import type { ReactNode } from "react";

/**
 * Utility functions for safely rendering unknown values in JSX
 */

/**
 * Safely render unknown values as React nodes
 * Handles all common cases with proper fallbacks
 */
export function safeRenderUnknown(value: unknown): ReactNode {
  if (value === null || value === undefined) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "[Complex Object]";
    }
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "[Unsupported value type]";
  }
}

/**
 * Safely render unknown values as formatted JSON strings
 * Useful for displaying query objects and other structured data
 */
export function safeRenderJson(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "[Object - Cannot serialize]";
    }
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "[Unsupported value type]";
  }
}

/**
 * Type guard to check if an unknown value is a non-empty object
 */
export function isNonEmptyObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  );
}

/**
 * Type guard to check if an unknown value is a non-empty array
 */
export function isNonEmptyArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Type guard to check if a value is a non-empty readonly array
 */
export function isNonEmptyReadonlyArray(
  value: readonly unknown[] | undefined,
): value is readonly unknown[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Safely check if an object has a specific property
 */
export function hasProperty<T extends object, K extends string>(
  obj: T,
  key: K,
): obj is T & Record<K, unknown> {
  return key in obj;
}

/**
 * Safely get a property value with type narrowing
 */
export function getProperty<T extends object, K extends keyof T>(
  obj: T,
  key: K,
): T[K] | undefined {
  return obj[key];
}

/**
 * Type guard to check if an object has a numeric property
 */
export function hasNumericProperty<T extends object, K extends string>(
  obj: T,
  key: K,
): obj is T & Record<K, number> {
  if (!hasProperty(obj, key)) return false;
  // After hasProperty check, TypeScript knows obj has the property
  return typeof obj[key] === "number";
}

/**
 * Type guard to check if an object has a string property
 */
export function hasStringProperty<T extends object, K extends string>(
  obj: T,
  key: K,
): obj is T & Record<K, string> {
  if (!hasProperty(obj, key)) return false;
  // After hasProperty check, TypeScript knows obj has the property
  return typeof obj[key] === "string";
}

/**
 * Safely get a numeric property from an object
 */
export function getNumericProperty<T extends object>(
  obj: T,
  key: string,
): number | undefined {
  if (hasNumericProperty(obj, key)) {
    return obj[key];
  }
  return undefined;
}

/**
 * Safely get a string property from an object
 */
export function getStringProperty<T extends object>(
  obj: T,
  key: string,
): string | undefined {
  if (hasStringProperty(obj, key)) {
    return obj[key];
  }
  return undefined;
}

/**
 * Type guard to check if an unknown value is a MongoDB stage object
 */
export function isMongoDBStage(
  value: unknown,
): value is Record<string, unknown> & { stage?: string } {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

/**
 * Type guard to check if a value has a specific property of a given type
 */
export function hasTypedProperty<T extends object, K extends string, V>(
  obj: T,
  key: K,
  typeCheck: (value: unknown) => value is V,
): obj is T & Record<K, V> {
  if (!hasProperty(obj, key)) return false;
  return typeCheck(obj[key]);
}

/**
 * Type guard to check if an object has an array property
 */
export function hasArrayProperty<T extends object, K extends string>(
  obj: T,
  key: K,
): obj is T & Record<K, unknown[]> {
  if (!hasProperty(obj, key)) return false;
  return Array.isArray(obj[key]);
}

/**
 * Safe type narrowing for MongoDB execution stages
 */
export function isExecutionStage(value: unknown): value is {
  stage?: string;
  indexName?: string;
  inputStage?: unknown;
  inputStages?: unknown[];
  shards?: unknown[];
  filter?: unknown;
  indexBounds?: unknown;
  keyPattern?: unknown;
} {
  return isMongoDBStage(value);
}

/**
 * Type guard for MongoDB plan with execution statistics
 */
export function hasExecutionStats(value: unknown): value is {
  executionStats: {
    nReturned?: number;
    totalDocsExamined?: number;
    totalKeysExamined?: number;
    executionTimeMillis?: number;
    executionStages?: unknown;
    allPlansExecution?: unknown[];
  };
} {
  return (
    isNonEmptyObject(value) &&
    hasProperty(value, "executionStats") &&
    isNonEmptyObject(value.executionStats)
  );
}
