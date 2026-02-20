"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Copy, Check } from "lucide-react";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import { JSONViewer } from "./JSONViewer";
import { JSONBreadcrumb } from "./JSONBreadcrumb";

// Register JavaScript language for syntax highlighting
hljs.registerLanguage("javascript", javascript);

type DisplayFormat = "json" | "text" | "javascript";

interface CodeViewerProps {
  content: unknown;
  maxHeight?: number;
  className?: string;
  copyLabel?: string;
  displayFormat?: DisplayFormat;
  header?: string;
  showCopy?: boolean;
}

/**
 * Code viewer for displaying JSON, ASCII diagrams, MongoDB commands, and other formatted code
 * with copy functionality and monospace formatting
 */
export function CodeViewer({
  content,
  maxHeight = 400,
  className = "",
  copyLabel = "Copy",
  displayFormat = "text",
  header,
  showCopy = true,
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [pathMapping, setPathMapping] = useState<string[]>([]); // Maps breadcrumb index to actual path
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Format content for display
  const formattedContent =
    displayFormat === "json"
      ? typeof content === "string"
        ? content
        : JSON.stringify(content, null, 2)
      : String(content);

  // Syntax highlight JavaScript code
  const highlightedJavaScript = useMemo(() => {
    if (displayFormat === "javascript") {
      return hljs.highlight(formattedContent, { language: "javascript" }).value;
    }
    return "";
  }, [displayFormat, formattedContent]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard write can fail in some browsers
    }
  };

  // Track visible JSON nodes for breadcrumb
  useEffect(() => {
    if (displayFormat !== "json" || !scrollContainerRef.current) {
      return;
    }

    const container = scrollContainerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        // Find all currently visible parent nodes
        const visibleNodes: Array<{
          path: string;
          depth: number;
          element: HTMLElement;
        }> = [];

        entries.forEach((entry) => {
          const element = entry.target as HTMLElement;
          const path = element.getAttribute("data-json-path");
          const depth = element.getAttribute("data-json-depth");

          if (
            entry.isIntersecting &&
            path !== null &&
            path !== "" &&
            depth !== null
          ) {
            visibleNodes.push({
              path,
              depth: parseInt(depth, 10),
              element,
            });
          }
        });

        // Find the topmost visible node to show in breadcrumb
        if (visibleNodes.length > 0) {
          // Find the node closest to the top of the container
          const containerRect = container.getBoundingClientRect();
          const topmostNode = visibleNodes.reduce((prev, current) => {
            const prevRect = prev.element.getBoundingClientRect();
            const currentRect = current.element.getBoundingClientRect();

            // Calculate distance from top of container
            const prevDistance = Math.abs(prevRect.top - containerRect.top);
            const currentDistance = Math.abs(
              currentRect.top - containerRect.top,
            );

            return currentDistance < prevDistance ? current : prev;
          });

          // Build path array from the topmost node
          // Parse path like ".executionStats.allPlansExecution[0].executionStages"
          const pathParts =
            topmostNode.path.match(/\.?([^.\[\]]+)|\[(\d+)\]/g) ?? [];

          // Get keys for each segment
          const breadcrumbPath: string[] = ["root"];
          const pathMap: string[] = [""]; // Map breadcrumb index to actual path
          let currentSegmentPath = "";

          for (const part of pathParts) {
            // Check if this is an array index like "[0]"
            const arrayIndexMatch = /\[(\d+)\]/.exec(part);

            if (arrayIndexMatch) {
              // It's an array index
              currentSegmentPath += part;
              const displayLabel = part; // Show as "[0]", "[1]", etc.
              breadcrumbPath.push(displayLabel);
              pathMap.push(currentSegmentPath);
            } else {
              // It's a regular property
              const cleanPart = part.startsWith(".") ? part.slice(1) : part;
              currentSegmentPath += currentSegmentPath
                ? `.${cleanPart}`
                : `.${cleanPart}`;
              const element = container.querySelector(
                `[data-json-path="${currentSegmentPath}"]`,
              );
              if (element) {
                const key = element.getAttribute("data-json-key");
                breadcrumbPath.push(key ?? cleanPart);
                pathMap.push(currentSegmentPath);
              }
            }
          }

          setCurrentPath(breadcrumbPath);
          setPathMapping(pathMap);
        }
      },
      {
        root: container,
        threshold: [0, 0.1, 0.5, 1],
        rootMargin: "40px 0px -90% 0px", // Account for breadcrumb height, focus on top
      },
    );

    // Observe all JSON parent nodes
    const nodes = container.querySelectorAll("[data-json-path]");
    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [displayFormat, content]);

  // Navigate to specific path segment
  const handleNavigate = (index: number) => {
    if (!scrollContainerRef.current) return;

    // Get the actual path for this breadcrumb index
    const targetPath = pathMapping[index];

    // Find the element with this path
    const element = scrollContainerRef.current.querySelector<HTMLElement>(
      `[data-json-path="${targetPath}"]`,
    );

    if (element) {
      const container = scrollContainerRef.current;

      // Calculate position relative to container using getBoundingClientRect
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      // Calculate how far down in the container the element is
      const relativeTop = elementRect.top - containerRect.top;
      const breadcrumbHeight = 40; // Height of sticky breadcrumb

      // Scroll the container, not the page
      container.scrollTo({
        top: container.scrollTop + relativeTop - breadcrumbHeight,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Header bar */}
      {header && (
        <div className="rounded-t-lg border-x border-t border-neutral-200 bg-neutral-100 px-4 py-2 font-mono text-xs text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
          {header}
        </div>
      )}

      {/* Copy button positioned in top-right */}
      {showCopy && (
        <button
          onClick={handleCopy}
          className={`absolute ${header ? "top-12" : "top-3"} right-3 z-10 flex items-center gap-1 rounded border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600 shadow transition-all duration-200 hover:bg-neutral-50 hover:text-neutral-800 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-600 dark:hover:text-neutral-200`}
          title={copied ? "Copied!" : copyLabel}
          type="button"
        >
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copied ? "Copied!" : "Copy"}
        </button>
      )}

      {/* Code content */}
      <div
        ref={scrollContainerRef}
        className={`overflow-auto border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 ${header ? "rounded-b-lg" : "rounded-lg"}`}
        style={{ maxHeight: `${maxHeight}px` }}
      >
        {displayFormat === "json" && currentPath.length > 0 && (
          <JSONBreadcrumb path={currentPath} onNavigate={handleNavigate} />
        )}
        {displayFormat === "json" ? (
          <div className="p-4 pr-20">
            <JSONViewer data={content} />
          </div>
        ) : displayFormat === "javascript" ? (
          <pre className="p-4 pr-20 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap">
            <code
              className="hljs language-javascript"
              dangerouslySetInnerHTML={{ __html: highlightedJavaScript }}
            />
          </pre>
        ) : (
          <pre className="p-4 pr-20 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap text-neutral-800 dark:text-neutral-200">
            {formattedContent}
          </pre>
        )}
      </div>
    </div>
  );
}
