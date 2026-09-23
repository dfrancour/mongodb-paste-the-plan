import type { SlowQueryFinding } from "#types/slow-query-analysis";
import {
  bySeverity,
  type WorkloadAnalyzer,
  type WorkloadInput,
} from "../types";
import { dominantNamespace } from "./dominant_namespace";
import { collectionScanShare } from "./collection_scan_share";
import { cursorBatchShare } from "./cursor_batch_share";

const WORKLOAD_ANALYZERS: readonly WorkloadAnalyzer[] = [
  dominantNamespace,
  collectionScanShare,
  cursorBatchShare,
];

export function analyzeWorkload(input: WorkloadInput): SlowQueryFinding[] {
  return WORKLOAD_ANALYZERS.flatMap((analyzer) => analyzer.analyze(input)).sort(
    bySeverity,
  );
}
