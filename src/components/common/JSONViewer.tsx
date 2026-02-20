"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface JSONViewerProps {
  data: unknown;
  className?: string;
}

const INDENT_SIZE = 16;
const TREE_LINE_OFFSET = 6;

/**
 * JSON viewer with syntax highlighting, collapsible objects/arrays, and indent dots
 */
export function JSONViewer({ data, className = "" }: JSONViewerProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCollapsed = (path: string) => {
    const newCollapsed = new Set(collapsed);
    if (newCollapsed.has(path)) {
      newCollapsed.delete(path);
    } else {
      newCollapsed.add(path);
    }
    setCollapsed(newCollapsed);
  };

  const renderValue = (
    value: unknown,
    path = "",
    depth = 0,
    key?: string,
    _isLast = true,
    showComma = false,
  ): React.ReactNode => {
    const isCollapsed = collapsed.has(path);
    const indent = depth * INDENT_SIZE;

    // Render indent dots
    const renderIndentDots = () => {
      if (depth === 0) return null;

      return (
        <div className="pointer-events-none absolute top-0 bottom-0 left-0 flex items-center">
          {Array.from({ length: depth }).map((_, i) => (
            <div
              key={i}
              className="h-0.5 w-0.5 rounded-full bg-neutral-300 dark:bg-neutral-600"
              style={{
                marginLeft:
                  i === 0 ? `${TREE_LINE_OFFSET}px` : `${INDENT_SIZE - 4}px`,
              }}
            />
          ))}
        </div>
      );
    };

    if (value === null) {
      return (
        <div className="relative py-0.5" style={{ paddingLeft: `${indent}px` }}>
          {renderIndentDots()}
          {key && (
            <>
              <span className="text-red-600 dark:text-red-400">
                &quot;{key}&quot;
              </span>
              <span className="text-neutral-500">:&nbsp;</span>
            </>
          )}
          <span className="text-neutral-500 italic">null</span>
          {showComma && <span className="text-neutral-500">,</span>}
        </div>
      );
    }

    if (typeof value === "string") {
      return (
        <div className="relative py-0.5" style={{ paddingLeft: `${indent}px` }}>
          {renderIndentDots()}
          {key && (
            <>
              <span className="text-red-600 dark:text-red-400">
                &quot;{key}&quot;
              </span>
              <span className="text-neutral-500">:&nbsp;</span>
            </>
          )}
          <span className="text-green-600 dark:text-green-400">
            &quot;{value}&quot;
          </span>
          {showComma && <span className="text-neutral-500">,</span>}
        </div>
      );
    }

    if (typeof value === "number") {
      return (
        <div className="relative py-0.5" style={{ paddingLeft: `${indent}px` }}>
          {renderIndentDots()}
          {key && (
            <>
              <span className="text-red-600 dark:text-red-400">
                &quot;{key}&quot;
              </span>
              <span className="text-neutral-500">:&nbsp;</span>
            </>
          )}
          <span className="text-primary dark:text-primary">{value}</span>
          {showComma && <span className="text-neutral-500">,</span>}
        </div>
      );
    }

    if (typeof value === "boolean") {
      return (
        <div className="relative py-0.5" style={{ paddingLeft: `${indent}px` }}>
          {renderIndentDots()}
          {key && (
            <>
              <span className="text-red-600 dark:text-red-400">
                &quot;{key}&quot;
              </span>
              <span className="text-neutral-500">:&nbsp;</span>
            </>
          )}
          <span className="text-purple-600 dark:text-purple-400">
            {String(value)}
          </span>
          {showComma && <span className="text-neutral-500">,</span>}
        </div>
      );
    }

    if (Array.isArray(value)) {
      const hasItems = value.length > 0;

      return (
        <div>
          <div
            className="relative py-0.5"
            style={{ paddingLeft: `${indent}px`, scrollMarginTop: "40px" }}
            data-json-path={path}
            data-json-key={key ?? "root"}
            data-json-depth={depth}
          >
            {/* Chevron in left margin */}
            {hasItems && (
              <button
                onClick={() => toggleCollapsed(path)}
                className="absolute flex h-4 w-4 items-center justify-center text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                style={{
                  left: "-20px",
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
                aria-expanded={!isCollapsed}
                aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${key || "root"} array`}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            )}
            {renderIndentDots()}
            <div className="flex items-center">
              {key ? (
                <>
                  <span className="text-red-600 dark:text-red-400">
                    &quot;{key}&quot;
                  </span>
                  <span className="text-neutral-500">:&nbsp;</span>
                  <span className="text-neutral-700 dark:text-neutral-300">
                    [
                  </span>
                </>
              ) : (
                <span className="text-neutral-700 dark:text-neutral-300">
                  [
                </span>
              )}
              {isCollapsed && hasItems && (
                <span className="mx-1 text-neutral-500">...</span>
              )}
              {isCollapsed && hasItems && (
                <span className="text-neutral-700 dark:text-neutral-300">
                  ]
                </span>
              )}
              {!hasItems && (
                <span className="text-neutral-700 dark:text-neutral-300">
                  ]
                </span>
              )}
            </div>
          </div>

          {hasItems && !isCollapsed && (
            <>
              {value.map((item, index) => (
                <div key={index} className="relative">
                  {renderValue(
                    item,
                    `${path}[${index}]`,
                    depth + 1,
                    undefined,
                    index === value.length - 1,
                    index < value.length - 1,
                  )}
                </div>
              ))}
              <div
                className="relative py-0.5"
                style={{ paddingLeft: `${indent}px` }}
              >
                {renderIndentDots()}
                <span className="text-neutral-700 dark:text-neutral-300">
                  ]
                </span>
              </div>
            </>
          )}
        </div>
      );
    }

    if (typeof value === "object" && value !== null) {
      const entries = Object.entries(value as Record<string, unknown>);
      const hasEntries = entries.length > 0;

      return (
        <div>
          <div
            className="relative py-0.5"
            style={{ paddingLeft: `${indent}px`, scrollMarginTop: "40px" }}
            data-json-path={path}
            data-json-key={key ?? "root"}
            data-json-depth={depth}
          >
            {/* Chevron in left margin */}
            {hasEntries && (
              <button
                onClick={() => toggleCollapsed(path)}
                className="absolute flex h-4 w-4 items-center justify-center text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                style={{
                  left: "-20px",
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
                aria-expanded={!isCollapsed}
                aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${key || "root"} object`}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            )}
            {renderIndentDots()}
            <div className="flex items-center">
              {key ? (
                <>
                  <span className="text-red-600 dark:text-red-400">
                    &quot;{key}&quot;
                  </span>
                  <span className="text-neutral-500">:&nbsp;</span>
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {"{"}
                  </span>
                </>
              ) : (
                <span className="text-neutral-700 dark:text-neutral-300">
                  {"{"}
                </span>
              )}
              {isCollapsed && hasEntries && (
                <span className="mx-1 text-neutral-500">...</span>
              )}
              {isCollapsed && hasEntries && (
                <span className="text-neutral-700 dark:text-neutral-300">
                  {"}"}
                </span>
              )}
              {!hasEntries && (
                <span className="text-neutral-700 dark:text-neutral-300">
                  {"}"}
                </span>
              )}
            </div>
          </div>

          {hasEntries && !isCollapsed && (
            <>
              {entries.map(([k, v], index) => (
                <div key={k} className="relative">
                  {renderValue(
                    v,
                    `${path}.${k}`,
                    depth + 1,
                    k,
                    index === entries.length - 1,
                    index < entries.length - 1,
                  )}
                </div>
              ))}
              <div
                className="relative py-0.5"
                style={{ paddingLeft: `${indent}px` }}
              >
                {renderIndentDots()}
                <span className="text-neutral-700 dark:text-neutral-300">
                  {"}"}
                </span>
              </div>
            </>
          )}
        </div>
      );
    }

    // Handle undefined specifically
    if (value === undefined) {
      return (
        <div className="relative py-0.5" style={{ paddingLeft: `${indent}px` }}>
          {renderIndentDots()}
          {key && (
            <>
              <span className="text-red-600 dark:text-red-400">
                &quot;{key}&quot;
              </span>
              <span className="text-neutral-500">: </span>
            </>
          )}
          <span className="text-neutral-500 italic">undefined</span>
          {showComma && <span className="text-neutral-500">,</span>}
        </div>
      );
    }

    // Fallback for any remaining types (functions, symbols, etc.)
    return (
      <div className="relative py-0.5" style={{ paddingLeft: `${indent}px` }}>
        {renderIndentDots()}
        {key && (
          <>
            <span className="text-red-600 dark:text-red-400">
              &quot;{key}&quot;
            </span>
            <span className="text-neutral-500">: </span>
          </>
        )}
        <span className="text-orange-600 dark:text-orange-400">
          [{typeof value}]
        </span>
        {showComma && <span className="text-neutral-500">,</span>}
      </div>
    );
  };

  return (
    <div
      className={`font-mono text-sm leading-relaxed text-neutral-800 dark:text-neutral-200 ${className}`}
      style={{ paddingLeft: "20px" }}
    >
      {renderValue(data, "", 0, undefined, true, false)}
    </div>
  );
}
