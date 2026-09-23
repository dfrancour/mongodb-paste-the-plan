import type { ReactNode } from "react";
import { documentEfficiencySeverity } from "#lib/slow-query";
import { formatCount } from "#lib/utils/formatters";
import { Tooltip } from "#components/common/Tooltip";
import { InfoButton } from "#components/shared/InfoButton";
import { EfficiencyValue } from "./EfficiencyValue";

interface KeyMetricValues {
  readonly nreturned?: number;
  readonly docsExamined?: number;
  readonly keysExamined?: number;
  readonly documentEfficiency?: number;
  readonly indexEfficiency?: number;
}

/**
 * The five numbers Paste the Plan leads with, under their log field names:
 * nreturned, docsExamined, keysExamined, and the two efficiencies.
 */
export function KeyMetrics({ values }: { readonly values: KeyMetricValues }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="grid grid-cols-2 gap-6 text-sm sm:grid-cols-3 lg:grid-cols-5">
        <Metric label="nreturned">{formatCount(values.nreturned)}</Metric>
        <Metric label="docsExamined">{formatCount(values.docsExamined)}</Metric>
        <Metric label="keysExamined">{formatCount(values.keysExamined)}</Metric>
        <Metric label="Document Efficiency" formula="nreturned / docsExamined">
          <EfficiencyValue
            value={values.documentEfficiency}
            severity={documentEfficiencySeverity(
              values.docsExamined,
              values.documentEfficiency,
            )}
          />
        </Metric>
        <Metric label="Index Efficiency" formula="nreturned / keysExamined">
          <EfficiencyValue value={values.indexEfficiency} />
        </Metric>
      </div>
    </div>
  );
}

function Metric({
  label,
  formula,
  children,
}: {
  readonly label: string;
  readonly formula?: string;
  readonly children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
        <span>{label}</span>
        {formula && (
          <Tooltip content={formula}>
            <InfoButton aria-label={`${label} formula`} size="sm" />
          </Tooltip>
        )}
      </div>
      <div className="font-semibold text-neutral-900 tabular-nums dark:text-neutral-100">
        {children}
      </div>
    </div>
  );
}
