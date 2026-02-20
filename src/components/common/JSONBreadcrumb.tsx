"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface JSONBreadcrumbProps {
  path: string[];
  onNavigate?: (index: number) => void;
}

/**
 * Breadcrumb component showing the current JSON path hierarchy
 * Displays path segments with navigation support
 */
export function JSONBreadcrumb({ path, onNavigate }: JSONBreadcrumbProps) {
  const [copied, setCopied] = useState(false);

  if (path.length === 0) {
    return null;
  }

  const handleCopy = async () => {
    // Build the full path string, excluding root
    const pathString = path
      .slice(1) // Skip root
      .map((segment, index) => {
        if (segment.startsWith("[")) return segment; // array indices
        if (index === 0) return segment; // first element after root, no leading dot
        return `.${segment}`; // properties with dot
      })
      .join("");

    try {
      await navigator.clipboard.writeText(pathString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard write can fail in some browsers
    }
  };

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white/95 px-4 py-2 text-xs backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-900/95">
      <div className="flex items-center">
        {path.map((segment, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && !segment.startsWith("[") && (
              <span className="px-0.5 text-neutral-700 dark:text-neutral-300">
                .
              </span>
            )}
            <button
              onClick={() => onNavigate?.(index)}
              className="cursor-pointer rounded px-0.5 py-0.5 font-mono text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              type="button"
              title={`Jump to ${segment}`}
            >
              {index === 0 ? `{${segment}}` : segment}
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={handleCopy}
        className="ml-2 flex items-center gap-1 rounded border border-neutral-200 bg-white px-2 py-1 text-neutral-600 transition-all hover:bg-neutral-50 hover:text-neutral-800 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-600 dark:hover:text-neutral-200"
        title={copied ? "Copied!" : "Copy path"}
        type="button"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
}
