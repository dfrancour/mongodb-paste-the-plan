/**
 * Convert MongoDB Extended JSON format to plain JSON.
 * Handles $numberInt, $numberLong, $numberDouble, $timestamp, $binary, etc.
 */
export function transformExtendedJSON(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => transformExtendedJSON(item));
  }

  if (typeof obj === "object") {
    const objRecord = obj as Record<string, unknown>;

    // Handle Extended JSON type objects
    if (Object.keys(objRecord).length === 1) {
      const key = Object.keys(objRecord)[0]!;
      const value = objRecord[key];

      switch (key) {
        case "$numberInt":
        case "$numberLong":
          return typeof value === "string" ? parseInt(value, 10) : value;
        case "$numberDouble":
          return typeof value === "string" ? parseFloat(value) : value;
        case "$timestamp":
          // Keep timestamp objects as-is for now
          return objRecord;
        case "$binary":
          // Keep binary objects as-is
          return objRecord;
        default:
          // Not an extended JSON type, continue processing
          break;
      }
    }

    // Recursively transform all properties
    const transformed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(objRecord)) {
      transformed[key] = transformExtendedJSON(value);
    }
    return transformed;
  }

  return obj;
}
