/**
 * URL-based compression for MongoDB explain plans.
 *
 * Uses native browser APIs (CompressionStream + base64url) to encode
 * explain plans entirely in the URL hash fragment. No backend required.
 *
 * Pipeline: JSON → UTF-8 → deflate-raw → base64url → version prefix → URL hash
 */

/**
 * Current version prefix for URL format.
 * Format: "v{number}:" prepended to compressed payload.
 *
 * Version history:
 * - v1: Initial format using deflate-raw + base64url
 */
export const URL_FORMAT_VERSION = "v1";

/**
 * Maximum allowed size for decompressed data (1MB).
 * Prevents decompression bomb attacks where a small compressed payload
 * expands to gigabytes of data, causing memory exhaustion.
 */
export const MAX_DECOMPRESSED_SIZE = 1024 * 1024; // 1MB

/**
 * Compresses a plan object to a URL-safe string.
 *
 * @param plan - The explain plan object to compress
 * @returns A base64url-encoded compressed string
 */
export async function compressPlan(plan: unknown): Promise<string> {
  // Check browser support
  if (typeof CompressionStream === "undefined") {
    throw new Error(
      "CompressionStream API not available. Please use a modern browser.",
    );
  }

  // Phase 1: Minify JSON (removes whitespace)
  const json = JSON.stringify(plan);
  const bytes = new TextEncoder().encode(json);

  // Phase 2: Compress using deflate-raw (no headers, minimal overhead)
  const stream = new CompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  // Don't await write/close individually - they block waiting for the readable side.
  // Errors propagate through the Response. The catch prevents unhandled rejection warnings
  // while still allowing the Response to surface the actual error.
  Promise.all([writer.write(bytes), writer.close()]).catch(() => {});
  const compressed = new Uint8Array(
    await new Response(stream.readable).arrayBuffer(),
  );

  // Phase 3: Encode to URL-safe base64 with version prefix
  return `${URL_FORMAT_VERSION}:${toBase64url(compressed)}`;
}

/**
 * Decompresses a URL-safe string back to the original plan object.
 *
 * Includes protection against decompression bombs by limiting output size.
 * Supports both versioned (v1:...) and legacy unversioned formats.
 *
 * @param encoded - The versioned or legacy base64url-encoded compressed string
 * @returns The original plan object
 * @throws Error if decompressed size exceeds MAX_DECOMPRESSED_SIZE
 * @throws Error if version is unsupported
 */
export async function decompressPlan(encoded: string): Promise<unknown> {
  // Phase 1: Parse version prefix and decode from base64url
  const { payload } = parseVersionedPayload(encoded);
  const compressed = fromBase64url(payload);

  // Phase 2: Decompress with size limit protection
  const stream = new DecompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  // Don't await write/close individually - they block waiting for the readable side.
  // Errors propagate through the reader. The catch prevents unhandled rejection warnings.
  Promise.all([writer.write(compressed as BufferSource), writer.close()]).catch(
    () => {},
  );

  // Stream decompressed data with size checking to prevent decompression bombs
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let totalSize = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalSize += value.length;
    if (totalSize > MAX_DECOMPRESSED_SIZE) {
      // Cancel the reader to stop decompression
      await reader.cancel();
      throw new Error(
        `Decompressed data exceeds maximum allowed size of ${MAX_DECOMPRESSED_SIZE} bytes. ` +
          `This may indicate a malformed or malicious URL.`,
      );
    }
    chunks.push(value);
  }

  // Combine chunks into final array
  const decompressed = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    decompressed.set(chunk, offset);
    offset += chunk.length;
  }

  // Phase 3: Parse JSON
  const json = new TextDecoder().decode(decompressed);
  return JSON.parse(json) as unknown;
}

/**
 * Generates a complete shareable URL with the compressed plan in the hash.
 *
 * @param plan - The explain plan object to share
 * @param baseUrl - Optional base URL (defaults to current page URL without hash)
 * @returns The complete shareable URL
 */
export async function generateShareUrl(
  plan: unknown,
  baseUrl?: string,
): Promise<string> {
  const compressed = await compressPlan(plan);
  const base = baseUrl ?? getBaseUrl();
  return `${base}#${compressed}`;
}

/**
 * Extracts and decompresses a plan from a URL hash.
 *
 * @param hash - The URL hash (with or without leading #)
 * @returns The decompressed plan object, or null if hash is empty/invalid
 */
export async function parsePlanFromHash(hash: string): Promise<unknown | null> {
  // Remove leading # if present
  const encoded = hash.startsWith("#") ? hash.slice(1) : hash;

  if (!encoded) {
    return null;
  }

  try {
    return await decompressPlan(encoded);
  } catch {
    // Invalid compressed data
    return null;
  }
}

/**
 * Calculates compression statistics for a plan.
 *
 * @param plan - The explain plan object
 * @returns Compression statistics including original size, compressed size, and ratio
 */
export async function getCompressionStats(plan: unknown): Promise<{
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  urlLength: number;
  fitsUniversalLimit: boolean;
  fitsModernLimit: boolean;
}> {
  const json = JSON.stringify(plan);
  const originalSize = new TextEncoder().encode(json).length;
  const compressed = await compressPlan(plan);
  // compressedSize includes version prefix (e.g., "v1:")
  const compressedSize = compressed.length;

  // URL length = base URL + '#' + versioned compressed payload
  // Estimate base URL length (typical paste-the-plan URL is ~60 chars)
  const estimatedBaseUrlLength = 60;
  const urlLength = estimatedBaseUrlLength + 1 + compressedSize;

  return {
    originalSize,
    compressedSize,
    compressionRatio: (originalSize - compressedSize) / originalSize,
    urlLength,
    fitsUniversalLimit: urlLength <= 2000, // 2KB - works everywhere
    fitsModernLimit: urlLength <= 8000, // 8KB - modern browsers + most shorteners
  };
}

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Parsed version information from a versioned payload.
 */
interface VersionedPayload {
  version: string;
  payload: string;
}

/**
 * Parses a versioned payload string into its version and payload components.
 *
 * @param encoded - The encoded string with version prefix (e.g., "v1:...")
 * @returns The version and payload
 * @throws Error if version prefix is missing or unsupported
 */
function parseVersionedPayload(encoded: string): VersionedPayload {
  // Check for version prefix (v{number}:)
  const versionMatch = encoded.match(/^(v\d+):/);

  if (!versionMatch) {
    throw new Error(
      "Invalid URL format: missing version prefix. " +
        "Expected format: v1:...",
    );
  }

  const version = versionMatch[1];
  const payload = encoded.slice(versionMatch[0].length);

  // Validate supported versions
  if (version !== "v1") {
    throw new Error(
      `Unsupported URL format version: ${version}. ` +
        `This URL may have been created with a newer version of the tool.`,
    );
  }

  return { version, payload };
}

/**
 * Gets the base URL for the current page (without hash).
 */
export function getBaseUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }
  const url = new URL(window.location.href);
  url.hash = "";
  return url.toString();
}

/**
 * Encodes a Uint8Array to a URL-safe base64 string.
 *
 * Uses btoa with URL-safe character replacement (- instead of +, _ instead of /).
 * This approach works universally across all browsers and Node.js environments.
 */
function toBase64url(bytes: Uint8Array): string {
  // Build binary string in chunks to avoid call stack limits with spread operator
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Decodes a URL-safe base64 string to a Uint8Array.
 *
 * Uses atob with URL-safe character restoration.
 * This approach works universally across all browsers and Node.js environments.
 */
function fromBase64url(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  return new Uint8Array([...binary].map((c) => c.charCodeAt(0)));
}
