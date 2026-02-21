"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TabViewContainer } from "./TabViewContainer";

interface TabLabels {
  analysis: string;
  json: string;
  ascii?: string;
}

interface ExpandableCardProps {
  title: string;
  icon: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
  headerAction?: React.ReactNode;
  analysisContent: React.ReactNode;
  jsonContent: React.ReactNode;
  asciiContent?: React.ReactNode;
  className?: string;
  defaultExpanded?: boolean;
  defaultView?: "analysis" | "json" | "ascii";
  tabLabels?: TabLabels;
  featured?: boolean;
  showTabs?: boolean;
}

/**
 * Reusable expandable card component with tabbed analysis/JSON/ASCII views
 *
 * Provides consistent structure for components that need to display
 * analysis content, JSON data, and ASCII visualizations with good UX.
 */
export function ExpandableCard({
  title,
  icon,
  subtitle,
  badge,
  headerAction,
  analysisContent,
  jsonContent,
  asciiContent,
  className = "",
  defaultExpanded = false,
  defaultView = "analysis",
  tabLabels,
  featured = false,
  showTabs = true,
}: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || featured);

  const containerClass = featured
    ? "container-primary-featured"
    : "container-primary";
  const isCollapsible = !featured;

  return (
    <div className={`${containerClass} ${className}`}>
      {/* Header */}
      <div
        className={`flex w-full items-center justify-between p-4 text-left ${
          isCollapsible
            ? `cursor-pointer rounded-t-lg transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700 ${
                !isExpanded ? "hover:rounded-b-lg" : ""
              }`
            : "rounded-t-lg"
        }`}
        {...(isCollapsible
          ? { onClick: () => setIsExpanded(!isExpanded) }
          : {})}
        {...(isCollapsible ? { role: "button" } : {})}
        {...(isCollapsible ? { "aria-expanded": isExpanded } : {})}
        {...(isCollapsible ? { tabIndex: 0 } : {})}
        {...(isCollapsible
          ? {
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsExpanded(!isExpanded);
                }
              },
            }
          : {})}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <h3 className="header-card flex items-center gap-2">
            {icon}
            {title}
          </h3>
          {subtitle && (
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              {subtitle}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {headerAction}
          {badge}
          {isCollapsible &&
            (isExpanded ? (
              <ChevronDown className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
            ))}
        </div>
      </div>

      {/* Content */}
      {(isExpanded || featured) && (
        <div
          className={
            isCollapsible
              ? "border-t border-neutral-200 dark:border-neutral-700"
              : ""
          }
        >
          <div className="p-4">
            {showTabs ? (
              <TabViewContainer
                analysisContent={analysisContent}
                jsonContent={jsonContent}
                asciiContent={asciiContent}
                defaultView={defaultView}
                tabLabels={tabLabels}
              />
            ) : (
              analysisContent
            )}
          </div>
        </div>
      )}
    </div>
  );
}
