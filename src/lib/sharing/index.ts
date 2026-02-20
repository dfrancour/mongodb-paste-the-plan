/**
 * Share service module.
 *
 * Provides abstractions for sharing MongoDB explain plans via different backends.
 */

export type {
  ShareService,
  ShareOptions,
  ShareResult,
  ShareStats,
} from "./types";

export {
  UrlHashShareService,
  defaultShareService,
} from "./url-hash-share-service";
