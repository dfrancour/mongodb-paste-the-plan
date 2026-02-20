/**
 * Share service types and interfaces.
 *
 * Provides an abstraction layer for different sharing backends:
 * - URL hash (client-side, no backend)
 * - Backend storage with short IDs (enterprise)
 * - Authenticated/private links (enterprise)
 */

/**
 * Options for creating a share.
 */
export interface ShareOptions {
  /**
   * Optional title for the shared plan.
   * Used for display purposes and link previews.
   */
  title?: string;

  /**
   * Optional description of the shared plan.
   */
  description?: string;

  /**
   * Access control level.
   * - "public": Anyone with the link can view (default)
   * - "private": Requires authentication
   * - "team": Only team members can view
   */
  access?: "public" | "private" | "team";

  /**
   * Optional expiration time for the share.
   * After this time, the share link will no longer work.
   */
  expiresAt?: Date;
}

/**
 * Result of creating a share.
 */
export interface ShareResult {
  /**
   * Unique identifier for this share.
   * For URL hash shares, this is the compressed payload.
   * For backend shares, this is a short ID like "abc123".
   */
  id: string;

  /**
   * The complete shareable URL.
   */
  url: string;

  /**
   * The type of share that was created.
   */
  type: "url-hash" | "backend";

  /**
   * When this share was created.
   */
  createdAt: Date;

  /**
   * When this share expires, if applicable.
   */
  expiresAt?: Date;
}

/**
 * Statistics about the share payload.
 */
export interface ShareStats {
  /**
   * Original plan size in bytes.
   */
  originalSize: number;

  /**
   * Compressed/encoded size in characters.
   */
  compressedSize: number;

  /**
   * Compression ratio (0-1, higher is better).
   */
  compressionRatio: number;

  /**
   * Total URL length.
   */
  urlLength: number;

  /**
   * Whether the URL fits the universal 2KB limit.
   */
  fitsUniversalLimit: boolean;

  /**
   * Whether the URL fits the modern 8KB limit.
   */
  fitsModernLimit: boolean;
}

/**
 * Interface for share service implementations.
 *
 * This abstraction allows switching between different sharing backends
 * without changing component code.
 *
 * @example
 * ```typescript
 * // URL hash implementation (current)
 * const urlService = new UrlHashShareService();
 * const result = await urlService.createShare(plan);
 *
 * // Future: Backend implementation
 * const backendService = new BackendShareService(apiClient);
 * const result = await backendService.createShare(plan, { access: "private" });
 * ```
 */
export interface ShareService {
  /**
   * The type of share service.
   */
  readonly type: "url-hash" | "backend";

  /**
   * Whether this service is available in the current environment.
   * For URL hash: checks for CompressionStream API support.
   * For backend: checks for authentication and network availability.
   */
  isAvailable(): boolean;

  /**
   * Creates a shareable link for the given plan.
   *
   * @param plan - The explain plan object to share
   * @param options - Optional sharing options (title, access, expiration)
   * @returns The share result with URL and metadata
   */
  createShare(plan: unknown, options?: ShareOptions): Promise<ShareResult>;

  /**
   * Retrieves a plan from a share identifier.
   *
   * @param id - The share identifier (compressed payload or short ID)
   * @returns The plan object, or null if not found/expired
   */
  getShare(id: string): Promise<unknown | null>;

  /**
   * Gets compression/size statistics for a plan without creating a share.
   *
   * @param plan - The explain plan object
   * @returns Statistics about the share payload
   */
  getStats(plan: unknown): Promise<ShareStats>;
}
