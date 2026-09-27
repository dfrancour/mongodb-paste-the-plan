/**
 * Web Worker entry: parses a log off the main thread. Entries survive
 * structured cloning (plain objects, arrays, and Dates), so the result is
 * the same `SlowQueryLoadResult` the synchronous path returns.
 */

import type { SlowQueryLoadResult } from "#types/slow-query";
import { loadSlowQueryLog } from "./loadSlowQueryLog";

export interface WorkerRequest {
  readonly text: string;
}

export type WorkerResponse =
  | { readonly ok: true; readonly result: SlowQueryLoadResult }
  | { readonly ok: false; readonly error: string };

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  try {
    const result = loadSlowQueryLog(event.data.text);
    const response: WorkerResponse = { ok: true, result };
    self.postMessage(response);
  } catch (error) {
    const response: WorkerResponse = {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to read log",
    };
    self.postMessage(response);
  }
};
