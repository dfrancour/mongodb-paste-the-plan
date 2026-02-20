"use client";

import { Server, Settings, Database } from "lucide-react";
import type { ExplainPlan } from "#types/explain-plan";
import { ExpandableCard } from "#components/common/ExpandableCard";
import { Icon } from "#components/common/Icon";
import { TabJSONViewer } from "#components/shared/TabJSONViewer";
import { extractServerEnvironmentJSON } from "#lib/renderers/jsonExtractors";

interface ServerEnvironmentProps {
  readonly explainPlan: ExplainPlan;
  readonly className?: string;
}

/**
 * Component for displaying MongoDB server environment information
 *
 * Shows server details, runtime parameters, and engine configuration that
 * affects query planning and execution behavior.
 */
export function ServerInfo({
  explainPlan,
  className = "",
}: ServerEnvironmentProps) {
  const serverInfo = explainPlan.serverInfo;
  const serverParameters = explainPlan.serverParameters;

  if (!serverInfo && !serverParameters) {
    return null; // No server environment data available
  }

  const getEngineInfo = () => {
    const frameworkControl = serverParameters?.internalQueryFrameworkControl;
    if (frameworkControl === "forceClassicEngine") {
      return {
        name: "Classic Query Engine",
        color: "text-neutral-900 dark:text-neutral-100",
        bg: "bg-primary-light dark:bg-primary-dark",
      };
    } else if (frameworkControl === "forceSBE") {
      return {
        name: "Slot-Based Execution (SBE)",
        color: "text-purple-600 dark:text-purple-400",
        bg: "bg-purple-50 dark:bg-purple-900",
      };
    } else {
      return {
        name: "Auto-Selected Engine",
        color: "text-green-600 dark:text-green-400",
        bg: "bg-green-50 dark:bg-green-900",
      };
    }
  };

  const engineInfo = getEngineInfo();

  // Analysis content
  const analysisContent = (
    <div className="space-y-4">
      {/* Server Information */}
      {serverInfo && (
        <div className="container-secondary">
          <h4 className="header-card mb-3 flex items-center gap-2">
            <Icon icon={Database} variant="primary" />
            Server Information
          </h4>

          <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
            <div className="flex items-center justify-between rounded bg-neutral-50 px-2 py-1 md:flex-col md:items-center md:text-center dark:bg-neutral-700">
              <span className="text-neutral-600 md:text-xs dark:text-neutral-400">
                Version
              </span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {typeof serverInfo.version === "string"
                  ? serverInfo.version
                  : "Unknown"}
              </span>
            </div>

            <div className="flex items-center justify-between rounded bg-neutral-50 px-2 py-1 md:flex-col md:items-center md:text-center dark:bg-neutral-700">
              <span className="text-neutral-600 md:text-xs dark:text-neutral-400">
                Host
              </span>
              <span className="ml-2 truncate font-medium text-neutral-900 md:ml-0 dark:text-neutral-100">
                {typeof serverInfo.host === "string"
                  ? serverInfo.host
                  : "Unknown"}
              </span>
            </div>

            <div className="flex items-center justify-between rounded bg-neutral-50 px-2 py-1 md:flex-col md:items-center md:text-center dark:bg-neutral-700">
              <span className="text-neutral-600 md:text-xs dark:text-neutral-400">
                Port
              </span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {typeof serverInfo.port === "string" ||
                typeof serverInfo.port === "number"
                  ? serverInfo.port
                  : "Unknown"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Query Framework Control */}
      <div className="container-secondary">
        <h4 className="header-card mb-3 flex items-center gap-2">
          <Icon icon={Settings} variant="primary" />
          Query Framework Control
        </h4>

        <div className="rounded bg-neutral-50 px-2 py-1 text-sm dark:bg-neutral-700">
          <span className={`font-medium ${engineInfo.color}`}>
            {engineInfo.name}
          </span>
          <span className="text-neutral-600 dark:text-neutral-400">
            {" "}
            (
            {typeof serverParameters?.internalQueryFrameworkControl === "string"
              ? serverParameters.internalQueryFrameworkControl
              : "tryBonsai"}
            )
          </span>
        </div>
      </div>
    </div>
  );

  // JSON content
  const jsonContent = (
    <TabJSONViewer data={extractServerEnvironmentJSON(explainPlan)} />
  );

  return (
    <ExpandableCard
      title="Server Environment"
      icon={<Icon icon={Server} variant="primary" />}
      subtitle={
        serverInfo
          ? `MongoDB ${typeof serverInfo.version === "string" ? serverInfo.version : "Unknown"}`
          : undefined
      }
      analysisContent={analysisContent}
      jsonContent={jsonContent}
      className={className}
    />
  );
}
