"use client";

import { useCallback, useState } from "react";
import { useSlowQueryLoader } from "#hooks/useSlowQueryLoader";
import type { SlowQueryLoadResult } from "#types/slow-query";
import { LogInput } from "./log-input/LogInput";
import { LoadedLogExplorer } from "./LoadedLogExplorer";

export function SlowQueryExplorerContainer() {
  const [loaded, setLoaded] = useState<SlowQueryLoadResult | null>(null);
  const [loadCount, setLoadCount] = useState(0);
  const onLoaded = useCallback((log: SlowQueryLoadResult) => {
    setLoaded(log);
    setLoadCount((n) => n + 1);
  }, []);
  const loader = useSlowQueryLoader(onLoaded);

  const clear = () => {
    setLoaded(null);
    loader.clearError();
  };

  return (
    <div className="spacing-component">
      <noscript>
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <h2 className="mb-2 text-lg font-semibold text-yellow-800 dark:text-yellow-200">
            JavaScript Required
          </h2>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Logs are parsed in your browser, which requires JavaScript.
          </p>
        </div>
      </noscript>

      {loaded ? (
        <LoadedLogExplorer key={loadCount} loaded={loaded} onClear={clear} />
      ) : (
        <LogInput
          isLoading={loader.isLoading}
          error={loader.error}
          onLoad={loader.load}
        />
      )}
    </div>
  );
}
