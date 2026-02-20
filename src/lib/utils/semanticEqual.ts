/**
 * Semantic equality comparison for MongoDB explain plans
 *
 * Handles MongoDB Extended JSON transformations and other semantic equivalences:
 * - Extended JSON: {"$numberInt": "42"} ≡ 42
 * - Field ordering: {a: 1, b: 2} ≡ {b: 2, a: 1}
 * - null/undefined: null ≡ undefined (for optional fields)
 * - Empty arrays: [] ≡ undefined (MongoDB omits empty arrays)
 */
export function semanticEqual(a: unknown, b: unknown): boolean {
  // Handle null/undefined equivalence (including empty arrays)
  if (a === null || a === undefined) {
    return (
      b === null || b === undefined || (Array.isArray(b) && b.length === 0)
    );
  }
  if (b === null || b === undefined) {
    return (
      a === null || a === undefined || (Array.isArray(a) && a.length === 0)
    );
  }

  // Handle Extended JSON number types (check BEFORE primitive comparison)
  // This allows {$numberInt: "42"} to match with 42
  if (typeof a === "object" && a !== null && typeof b !== "object") {
    const aExtended = extractExtendedJSONValue(a);
    if (aExtended !== null) {
      return aExtended === b;
    }
    // Not Extended JSON - check if it's an empty array vs undefined/null
    if (Array.isArray(a) && a.length === 0 && (b === undefined || b === null)) {
      return true;
    }
  }
  if (typeof b === "object" && b !== null && typeof a !== "object") {
    const bExtended = extractExtendedJSONValue(b);
    if (bExtended !== null) {
      return bExtended === a;
    }
    // Not Extended JSON - check if it's an empty array vs undefined/null
    if (Array.isArray(b) && b.length === 0 && (a === undefined || a === null)) {
      return true;
    }
  }

  // Handle primitive types (both are non-objects)
  if (typeof a !== "object" || typeof b !== "object") {
    return a === b;
  }

  // Both are objects from here on
  const aExtended = extractExtendedJSONValue(a);
  const bExtended = extractExtendedJSONValue(b);

  // If both are Extended JSON, compare the extracted values
  if (aExtended !== null && bExtended !== null) {
    return aExtended === bExtended;
  }

  // If one is Extended JSON and the other is a regular object (not primitive)
  if (aExtended !== null || bExtended !== null) {
    return false;
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    // Empty arrays are equivalent to undefined
    if (a.length === 0 && b.length === 0) {
      return true;
    }
    if (a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => semanticEqual(item, b[index]));
  }

  // One is array, other is not
  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }

  // Handle objects (ignore field ordering)
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;

  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);

  // Check if all keys in 'a' exist in 'b' with equivalent values
  for (const key of aKeys) {
    if (!(key in bObj)) {
      // Key missing in b - check if value in a is null/undefined or empty array
      const aValue = aObj[key];
      if (
        aValue === null ||
        aValue === undefined ||
        (Array.isArray(aValue) && aValue.length === 0)
      ) {
        continue; // Acceptable difference
      }
      return false;
    }
    if (!semanticEqual(aObj[key], bObj[key])) {
      return false;
    }
  }

  // Check if all keys in 'b' exist in 'a' with equivalent values
  for (const key of bKeys) {
    if (!(key in aObj)) {
      // Key missing in a - check if value in b is null/undefined or empty array
      const bValue = bObj[key];
      if (
        bValue === null ||
        bValue === undefined ||
        (Array.isArray(bValue) && bValue.length === 0)
      ) {
        continue; // Acceptable difference
      }
      return false;
    }
    // Already checked in previous loop
  }

  return true;
}

/**
 * Extract the primitive value from MongoDB Extended JSON number types
 * Returns null if not an Extended JSON number type
 */
function extractExtendedJSONValue(obj: unknown): number | null {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    return null;
  }

  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record);

  // Extended JSON objects have exactly one key
  if (keys.length !== 1) {
    return null;
  }

  const key = keys[0]!;
  const value = record[key];

  switch (key) {
    case "$numberInt":
    case "$numberLong":
      return typeof value === "string" ? parseInt(value, 10) : null;
    case "$numberDouble":
      return typeof value === "string" ? parseFloat(value) : null;
    default:
      return null;
  }
}

/**
 * Find the first difference between two values (for debugging)
 * Returns a human-readable path to the first difference found
 */
export function findDifference(
  a: unknown,
  b: unknown,
  path = "root",
): string | null {
  if (semanticEqual(a, b)) {
    return null; // No difference
  }

  // Handle null/undefined
  if ((a === null || a === undefined) && b !== null && b !== undefined) {
    return `${path}: ${a} !== ${b}`;
  }
  if ((b === null || b === undefined) && a !== null && a !== undefined) {
    return `${path}: ${a} !== ${b}`;
  }

  // Handle primitives
  if (typeof a !== "object" || typeof b !== "object") {
    return `${path}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`;
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return `${path}: array length ${a.length} !== ${b.length}`;
    }
    for (let i = 0; i < a.length; i++) {
      const diff = findDifference(a[i], b[i], `${path}[${i}]`);
      if (diff) return diff;
    }
  }

  if (Array.isArray(a) !== Array.isArray(b)) {
    return `${path}: array vs non-array`;
  }

  // Handle objects
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;

  const allKeys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);

  for (const key of allKeys) {
    if (!(key in aObj)) {
      return `${path}.${key}: missing in first object`;
    }
    if (!(key in bObj)) {
      return `${path}.${key}: missing in second object`;
    }

    const diff = findDifference(aObj[key], bObj[key], `${path}.${key}`);
    if (diff) return diff;
  }

  return `${path}: objects differ but exact difference not found`;
}
