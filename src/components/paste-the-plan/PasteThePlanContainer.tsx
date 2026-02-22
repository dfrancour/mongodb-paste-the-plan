"use client";

import { useState, useMemo } from "react";
import type { FlowVisualizationProps } from "#types/flow-visualization";
import type { ParsedPlan } from "#lib/parsers";
import {
  runAllAnalyzers,
  analyzeExplainPlan,
  analyzePlanSelection,
} from "#lib/analyzers";
import { useUrlPlan } from "#hooks/useUrlPlan";
import { ExplainPlanInput } from "./plan-input/ExplainPlanInput";
import { FlowVisualization } from "./flow-diagram/FlowVisualization";
import { PlanSelection } from "./plan-selection/PlanSelection";
import { ESRAnalysis as ESRAnalysisComponent } from "./esr-analysis/ESRAnalysis";
import { MongoCommandDisplay } from "./command-display/MongoCommandDisplay";
import { ServerInfo as ServerEnvironmentComponent } from "./server-info/ServerInfo";

export function PasteThePlanContainer() {
  const [lastAnalyzedPlan, setLastAnalyzedPlan] = useState<ParsedPlan | null>(
    null,
  );

  // Check for plan data in URL hash on mount
  const {
    plan: urlPlan,
    isLoading: urlPlanLoading,
    error: urlPlanError,
  } = useUrlPlan();

  const handlePlanAnalyzed = (result: ParsedPlan) => {
    setLastAnalyzedPlan(result);
  };

  const handleClearPlan = () => {
    setLastAnalyzedPlan(null);
  };

  // Memoize visualization configs — ParsedPlan already has normalized trees
  const vizConfigs = useMemo(() => {
    if (!lastAnalyzedPlan) return { planConfig: null, execConfig: null };

    try {
      const { plan, execution, raw, sbe, isSBE } = lastAnalyzedPlan;
      const engine = isSBE ? "sbe" : "classic";

      // Prefer execution data (has metrics) when available, fall back to plan.
      const rootStage = execution ?? plan;
      const analysisResults = runAllAnalyzers({
        explainPlan: raw,
        rootStage,
      });

      const planConfig: FlowVisualizationProps =
        engine === "sbe" && sbe
          ? {
              mode: "plan",
              engine: "sbe",
              plan,
              rawPlan: raw,
              sbePlan: sbe,
              analysisResults,
            }
          : {
              mode: "plan",
              engine: "classic",
              plan,
              rawPlan: raw,
              analysisResults,
            };

      let execConfig: FlowVisualizationProps | null = null;
      if (execution) {
        execConfig =
          engine === "sbe" && sbe
            ? {
                mode: "execution",
                engine: "sbe",
                execution,
                rawPlan: raw,
                sbePlan: sbe,
                analysisResults,
              }
            : {
                mode: "execution",
                engine: "classic",
                execution,
                rawPlan: raw,
                analysisResults,
              };
      }

      return { planConfig, execConfig };
    } catch {
      return { planConfig: null, execConfig: null };
    }
  }, [lastAnalyzedPlan]);

  return (
    <div className="spacing-component">
      <noscript>
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <h2 className="mb-2 text-lg font-semibold text-yellow-800 dark:text-yellow-200">
            JavaScript Required
          </h2>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            This tool provides interactive visualization and analysis of MongoDB
            explain plans, which cannot be accomplished without client-side
            functionality. Enable JavaScript in your browser to use this tool.
          </p>
        </div>
      </noscript>

      <ExplainPlanInput
        onPlanAnalyzed={handlePlanAnalyzed}
        onClearPlan={handleClearPlan}
        hasAnalyzedPlan={!!lastAnalyzedPlan}
        initialPlan={urlPlan}
        initialPlanLoading={urlPlanLoading}
        initialPlanError={urlPlanError}
      />

      {/* MongoDB Command Display */}
      {lastAnalyzedPlan && (
        <MongoCommandDisplay explainPlan={lastAnalyzedPlan.raw} className="" />
      )}

      {/* Plan Analysis (Selection or Single Plan) */}
      {lastAnalyzedPlan &&
        (() => {
          const planSelectionAnalysis = analyzePlanSelection(
            lastAnalyzedPlan.raw,
          );
          return planSelectionAnalysis ? (
            <PlanSelection
              analysis={planSelectionAnalysis}
              rawExplainPlan={lastAnalyzedPlan.raw}
              className=""
            />
          ) : null;
        })()}

      {/* Query Plan Visualization - Always show, collapsed when execution stats exist */}
      {vizConfigs.planConfig && (
        <FlowVisualization
          {...vizConfigs.planConfig}
          defaultExpanded={!vizConfigs.execConfig}
        />
      )}

      {/* Execution Stats Visualization - Show when executionStats exists */}
      {vizConfigs.execConfig && (
        <FlowVisualization {...vizConfigs.execConfig} />
      )}

      {/* ESR Index Analysis */}
      {lastAnalyzedPlan &&
        (() => {
          const esrAnalyses = analyzeExplainPlan(lastAnalyzedPlan.raw);
          return (
            <ESRAnalysisComponent
              analyses={esrAnalyses}
              rawExplainPlan={lastAnalyzedPlan.raw}
              className=""
            />
          );
        })()}

      {/* Server Environment */}
      {lastAnalyzedPlan && (
        <ServerEnvironmentComponent
          explainPlan={lastAnalyzedPlan.raw}
          className=""
        />
      )}
    </div>
  );
}
