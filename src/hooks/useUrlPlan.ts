"use client";

import { useState, useEffect } from "react";
import { parsePlanFromHash } from "#lib/url-compression";

interface UseUrlPlanResult {
  /** The plan data extracted from the URL, or null if none/invalid */
  plan: unknown | null;
  /** Whether the hook is currently loading/parsing the URL */
  isLoading: boolean;
  /** Error message if parsing failed */
  error: string | null;
  /** Whether a plan was found in the URL (even if parsing failed) */
  hasUrlPlan: boolean;
  /** Clear the URL hash and reset state */
  clearUrlPlan: () => void;
}

/**
 * Hook to detect and parse MongoDB explain plans from the URL hash.
 *
 * On mount, checks if the current URL contains a compressed plan in the
 * hash fragment. If found, decompresses and returns it.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { plan, isLoading, error } = useUrlPlan();
 *
 *   useEffect(() => {
 *     if (plan) {
 *       // Handle the loaded plan
 *       processPlan(plan);
 *     }
 *   }, [plan]);
 *
 *   if (isLoading) return <div>Loading plan from URL...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *   // ...
 * }
 * ```
 */
export function useUrlPlan(): UseUrlPlanResult {
  const [plan, setPlan] = useState<unknown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUrlPlan, setHasUrlPlan] = useState(false);

  useEffect(() => {
    async function loadPlanFromUrl() {
      // Only run in browser
      if (typeof window === "undefined") {
        setIsLoading(false);
        return;
      }

      const hash = window.location.hash;

      // No hash or empty hash
      if (!hash || hash === "#") {
        setIsLoading(false);
        return;
      }

      setHasUrlPlan(true);

      try {
        const decompressedPlan = await parsePlanFromHash(hash);

        if (decompressedPlan === null) {
          setError("Invalid plan data in URL");
          setIsLoading(false);
          return;
        }

        setPlan(decompressedPlan);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load plan from URL",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadPlanFromUrl();
  }, []);

  const clearUrlPlan = () => {
    if (typeof window !== "undefined") {
      // Remove the hash without triggering a page reload (preserve query params)
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
    setPlan(null);
    setError(null);
    setHasUrlPlan(false);
  };

  return {
    plan,
    isLoading,
    error,
    hasUrlPlan,
    clearUrlPlan,
  };
}
