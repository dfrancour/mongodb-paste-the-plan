import type { FindingSeverity } from "#types/analysis";
import { formatEfficiency } from "#lib/utils/planEfficiencyUtils";
import {
  DOCUMENT_EFFICIENCY_THRESHOLDS,
  MIN_DOCS_EXAMINED,
} from "#lib/analyzers/stage/low_document_efficiency";
import { documentEfficiencyOf } from "../../group/metrics";
import type { EntryAnalyzer } from "../types";

/** How bad a document efficiency is, or undefined when it is fine or too small to judge. */
export function documentEfficiencySeverity(
  docsExamined: number | undefined,
  documentEfficiency: number | undefined,
): FindingSeverity | undefined {
  if (
    docsExamined === undefined ||
    docsExamined < MIN_DOCS_EXAMINED ||
    documentEfficiency === undefined
  ) {
    return undefined;
  }
  if (documentEfficiency < DOCUMENT_EFFICIENCY_THRESHOLDS.critical)
    return "critical";
  if (documentEfficiency < DOCUMENT_EFFICIENCY_THRESHOLDS.warning)
    return "warning";
  return undefined;
}

/** Many documents examined for each one returned. */
export const lowDocumentEfficiency: EntryAnalyzer = {
  id: "entry:low_document_efficiency",
  label: "Low document efficiency",
  analyze: (entry) => {
    const { docsExamined, nreturned } = entry.metrics;
    const documentEfficiency = documentEfficiencyOf(entry.metrics);
    const severity = documentEfficiencySeverity(
      docsExamined,
      documentEfficiency,
    );
    if (
      severity === undefined ||
      docsExamined === undefined ||
      documentEfficiency === undefined
    ) {
      return [];
    }
    return [
      {
        id: "low-document-efficiency",
        analyzerId: lowDocumentEfficiency.id,
        layer: "entry",
        severity,
        category: "performance",
        title: "Low document efficiency",
        description: `${docsExamined.toLocaleString()} docsExamined, ${(nreturned ?? 0).toLocaleString()} nreturned (${formatEfficiency(documentEfficiency)} document efficiency).`,
        suggestion:
          "An index whose bounds match the predicate more tightly reduces documents examined; check whether the index prefix includes every equality field.",
      },
    ];
  },
};
