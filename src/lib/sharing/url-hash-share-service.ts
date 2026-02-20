/**
 * URL hash-based share service implementation.
 *
 * Stores the entire plan in the URL hash fragment using compression.
 * No backend required - fully client-side.
 */

import {
  compressPlan,
  decompressPlan,
  getCompressionStats,
  getBaseUrl,
} from "#lib/url-compression";
import type {
  ShareService,
  ShareOptions,
  ShareResult,
  ShareStats,
} from "./types";

/**
 * Share service that encodes plans in URL hash fragments.
 *
 * Uses native browser compression (deflate-raw) and base64url encoding
 * to store the entire plan in the URL. No backend storage required.
 *
 * Limitations:
 * - URL length limits (2KB universal, 8KB modern browsers)
 * - No access control (anyone with URL can view)
 * - No expiration (links work indefinitely)
 * - No analytics (no view tracking)
 *
 * @example
 * ```typescript
 * const service = new UrlHashShareService();
 *
 * if (service.isAvailable()) {
 *   const result = await service.createShare(explainPlan);
 *   console.log(result.url); // https://example.com/tool#v1:eJzNVk1v...
 * }
 * ```
 */
export class UrlHashShareService implements ShareService {
  readonly type = "url-hash" as const;

  private fixedBaseUrl: string | undefined;

  /**
   * Creates a new URL hash share service.
   *
   * @param baseUrl - Optional fixed base URL for generated links.
   *                  If not provided, uses current page URL at share time.
   */
  constructor(baseUrl?: string) {
    this.fixedBaseUrl = baseUrl;
  }

  /**
   * Gets the base URL for share links.
   * Uses fixed URL if provided, otherwise current page URL.
   */
  private getBaseUrlForShare(): string {
    return this.fixedBaseUrl ?? getBaseUrl();
  }

  /**
   * Checks if the CompressionStream API is available.
   */
  isAvailable(): boolean {
    return typeof CompressionStream !== "undefined";
  }

  /**
   * Creates a shareable URL with the plan encoded in the hash.
   *
   * Note: ShareOptions (title, access, expiresAt) are ignored for URL hash
   * shares since the format doesn't support metadata. These options are
   * accepted for interface compatibility with backend implementations.
   */
  async createShare(
    plan: unknown,
    _options?: ShareOptions,
  ): Promise<ShareResult> {
    if (!this.isAvailable()) {
      throw new Error(
        "CompressionStream API not available. Please use a modern browser.",
      );
    }

    const compressed = await compressPlan(plan);
    const url = `${this.getBaseUrlForShare()}#${compressed}`;

    return {
      id: compressed,
      url,
      type: "url-hash",
      createdAt: new Date(),
      // URL hash shares don't expire
    };
  }

  /**
   * Retrieves a plan from a compressed hash payload.
   *
   * @param id - The compressed payload (with or without version prefix)
   * @returns The decompressed plan, or null if invalid
   */
  async getShare(id: string): Promise<unknown | null> {
    if (!id) {
      return null;
    }

    try {
      return await decompressPlan(id);
    } catch {
      // Invalid or corrupted data
      return null;
    }
  }

  /**
   * Gets compression statistics for a plan.
   */
  async getStats(plan: unknown): Promise<ShareStats> {
    const stats = await getCompressionStats(plan);
    return {
      originalSize: stats.originalSize,
      compressedSize: stats.compressedSize,
      compressionRatio: stats.compressionRatio,
      urlLength: stats.urlLength,
      fitsUniversalLimit: stats.fitsUniversalLimit,
      fitsModernLimit: stats.fitsModernLimit,
    };
  }
}

/**
 * Default share service instance using URL hash storage.
 *
 * Use this for simple cases where you don't need to customize the base URL.
 *
 * @example
 * ```typescript
 * import { defaultShareService } from "#lib/sharing/url-hash-share-service";
 *
 * const result = await defaultShareService.createShare(plan);
 * ```
 */
export const defaultShareService = new UrlHashShareService();
