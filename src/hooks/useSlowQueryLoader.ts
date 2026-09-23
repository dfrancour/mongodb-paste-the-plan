"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SlowQueryLoadResult } from "#types/slow-query";
import { loadSlowQueryLog, SlowQueryParseError } from "#lib/slow-query";
import type {
  WorkerRequest,
  WorkerResponse,
} from "#lib/slow-query/parse/slowQueryLog.worker";

/** Above this many characters the log is parsed in a Web Worker. */
const WORKER_THRESHOLD_CHARS = 5 * 1024 * 1024;
/** Above this many characters the UI warns before parsing. */
export const LARGE_LOG_CHARS = 50 * 1024 * 1024;

/**
 * Parses log text on the main thread for small inputs and in a worker for
 * large ones, exposing a single `load` with loading and error state.
 */
export function useSlowQueryLoader(
  onLoaded: (log: SlowQueryLoadResult) => void,
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const finish = useCallback(
    (result: SlowQueryLoadResult) => {
      setIsLoading(false);
      if (result.entries.length === 0) {
        setError(
          'No slow query entries found. Expected structured MongoDB log lines with "msg": "Slow query".',
        );
        return;
      }
      onLoaded(result);
    },
    [onLoaded],
  );

  const fail = useCallback((message: string) => {
    setIsLoading(false);
    setError(message);
  }, []);

  const load = useCallback(
    (text: string) => {
      setError(null);
      setIsLoading(true);
      if (
        text.length < WORKER_THRESHOLD_CHARS ||
        typeof Worker === "undefined"
      ) {
        try {
          finish(loadSlowQueryLog(text));
        } catch (err) {
          fail(describeError(err));
        }
        return;
      }
      workerRef.current?.terminate();
      const worker = new Worker(
        new URL(
          "../lib/slow-query/parse/slowQueryLog.worker.ts",
          import.meta.url,
        ),
      );
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        worker.terminate();
        workerRef.current = null;
        if (event.data.ok) finish(event.data.result);
        else fail(event.data.error);
      };
      worker.onerror = () => {
        worker.terminate();
        workerRef.current = null;
        fail("Unable to parse the log in the background; try a smaller file.");
      };
      const request: WorkerRequest = { text };
      worker.postMessage(request);
    },
    [finish, fail],
  );

  return { load, isLoading, error, clearError: () => setError(null) };
}

function describeError(err: unknown): string {
  if (err instanceof SlowQueryParseError) return err.message;
  return err instanceof Error
    ? `Unable to read log: ${err.message}`
    : "Unable to read log";
}
