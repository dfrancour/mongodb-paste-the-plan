"use client";

import { useState } from "react";
import { Eye, Braces, FileText } from "lucide-react";

interface TabLabels {
  analysis: string;
  json: string;
  ascii?: string;
}

interface TabViewContainerProps {
  analysisContent: React.ReactNode;
  jsonContent: React.ReactNode;
  asciiContent?: React.ReactNode;
  defaultView?: "analysis" | "json" | "ascii";
  className?: string;
  tabLabels?: TabLabels;
}

type ViewMode = "analysis" | "json" | "ascii";

/**
 * Tabbed container that switches between Analysis, JSON, and ASCII views
 *
 * Provides a clean, intuitive interface for viewing component data in
 * different formats without spatial disconnect between toggle and content.
 */
export function TabViewContainer({
  analysisContent,
  jsonContent,
  asciiContent,
  defaultView = "analysis",
  className = "",
  tabLabels = {
    analysis: "Analysis",
    json: "JSON",
    ascii: "ASCII",
  },
}: TabViewContainerProps) {
  const [activeView, setActiveView] = useState<ViewMode>(defaultView);

  return (
    <div className={className}>
      {/* Tab Header */}
      <div
        className="mb-4 flex border-b border-neutral-200 dark:border-neutral-700"
        role="tablist"
      >
        <button
          onClick={() => setActiveView("analysis")}
          className={`flex cursor-pointer items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-all duration-200 ${
            activeView === "analysis"
              ? "border-primary bg-primary-light dark:bg-primary-dark text-neutral-900 dark:text-neutral-100"
              : "border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-neutral-200"
          }`}
          type="button"
          role="tab"
          aria-selected={activeView === "analysis"}
          aria-controls="analysis-panel"
          id="analysis-tab"
        >
          <Eye className="h-4 w-4" />
          {tabLabels.analysis}
        </button>

        {asciiContent && (
          <button
            onClick={() => setActiveView("ascii")}
            className={`flex cursor-pointer items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-all duration-200 ${
              activeView === "ascii"
                ? "border-primary bg-primary-light dark:bg-primary-dark text-neutral-900 dark:text-neutral-100"
                : "border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-neutral-200"
            }`}
            type="button"
            role="tab"
            aria-selected={activeView === "ascii"}
            aria-controls="ascii-panel"
            id="ascii-tab"
          >
            <FileText className="h-4 w-4" />
            {tabLabels.ascii ?? "ASCII"}
          </button>
        )}

        <button
          onClick={() => setActiveView("json")}
          className={`flex cursor-pointer items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-all duration-200 ${
            activeView === "json"
              ? "border-primary bg-primary-light dark:bg-primary-dark text-neutral-900 dark:text-neutral-100"
              : "border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-neutral-200"
          }`}
          type="button"
          role="tab"
          aria-selected={activeView === "json"}
          aria-controls="json-panel"
          id="json-tab"
        >
          <Braces className="h-4 w-4" />
          {tabLabels.json}
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeView === "analysis" && (
          <div
            role="tabpanel"
            id="analysis-panel"
            aria-labelledby="analysis-tab"
          >
            {analysisContent}
          </div>
        )}
        {activeView === "json" && (
          <div role="tabpanel" id="json-panel" aria-labelledby="json-tab">
            {jsonContent}
          </div>
        )}
        {activeView === "ascii" && (
          <div role="tabpanel" id="ascii-panel" aria-labelledby="ascii-tab">
            {asciiContent}
          </div>
        )}
      </div>
    </div>
  );
}
