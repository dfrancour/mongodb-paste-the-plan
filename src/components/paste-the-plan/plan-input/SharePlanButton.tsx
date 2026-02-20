"use client";

import { useState, useEffect } from "react";
import { Share2, Check, Copy, AlertTriangle } from "lucide-react";
import { Icon } from "#components/common/Icon";
import { defaultShareService, type ShareService } from "#lib/sharing";

interface SharePlanButtonProps {
  /** The explain plan object to share */
  plan: unknown;
  /** Optional CSS class name */
  className?: string;
  /** Optional share service (defaults to URL hash service) */
  shareService?: ShareService;
}

type ShareState = "idle" | "generating" | "ready" | "copied" | "error";

/**
 * Button component for sharing MongoDB explain plans via URL.
 *
 * Generates a compressed URL containing the entire plan in the hash fragment.
 */
export function SharePlanButton({
  plan,
  className = "",
  shareService = defaultShareService,
}: SharePlanButtonProps) {
  const [state, setState] = useState<ShareState>("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateUrl = async () => {
    setState("generating");
    setError(null);

    try {
      const result = await shareService.createShare(plan);
      setShareUrl(result.url);
      setState("ready");

      // Update browser URL without reload
      window.history.replaceState(null, "", result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate URL");
      setState("error");
    }
  };

  // Reset "copied" state back to "ready" after 2 seconds
  useEffect(() => {
    if (state !== "copied") return;
    const timer = setTimeout(() => setState("ready"), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  const handleCopyUrl = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setState("copied");
    } catch {
      setError("Failed to copy to clipboard");
      setState("error");
    }
  };

  // Idle state - show generate button
  if (state === "idle" || state === "generating") {
    return (
      <button
        type="button"
        onClick={handleGenerateUrl}
        disabled={state === "generating"}
        className={`btn-secondary flex items-center gap-2 ${className}`}
      >
        <Icon icon={Share2} size="sm" variant="inherit" />
        {state === "generating" ? "Generating..." : "Generate Plan Share URL"}
      </button>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className="text-performance-poor flex items-center gap-2 text-sm">
          <Icon icon={AlertTriangle} size="sm" variant="error" />
          <span>{error ?? "An error occurred"}</span>
        </div>
        <button
          type="button"
          onClick={handleGenerateUrl}
          className="btn-secondary flex items-center gap-2"
        >
          <Icon icon={Share2} size="sm" variant="inherit" />
          Try Again
        </button>
      </div>
    );
  }

  // Ready/Copied state - show copy button
  return (
    <button
      type="button"
      onClick={handleCopyUrl}
      className={`btn-secondary flex items-center gap-2 ${className} ${
        state === "copied" ? "bg-green-50 dark:bg-green-900/20" : ""
      }`}
    >
      {state === "copied" ? (
        <>
          <Icon icon={Check} size="sm" variant="success" />
          <span className="text-performance-good">Copied!</span>
        </>
      ) : (
        <>
          <Icon icon={Copy} size="sm" variant="inherit" />
          Copy Plan Share URL
        </>
      )}
    </button>
  );
}
