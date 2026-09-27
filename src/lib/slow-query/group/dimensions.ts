import type { SlowQueryEntry } from "#types/slow-query";
import { collapsePlanSummary } from "../parse/planSummary";

export type GroupDimensionId =
  | "shape"
  | "namespace"
  | "command"
  | "planSummary"
  | "comment"
  | "appName"
  | "queryShapeHash"
  | "remote";

export interface GroupDimension {
  readonly id: GroupDimensionId;
  readonly label: string;
  /** Grouping key; entries with equal keys share a group. */
  readonly keyOf: (entry: SlowQueryEntry) => string;
  /**
   * For dimensions keyed within a namespace: the part of the label after the
   * namespace. Groups are then labeled `namespace · detail`.
   */
  readonly detailOf?: (entry: SlowQueryEntry) => string;
  /** False when no entry records the field, so the dimension is not offered. */
  readonly recorded?: (entry: SlowQueryEntry) => boolean;
}

const NOT_RECORDED = "(not recorded)";
const NO_COMMENT = "(no comment)";

export const GROUP_DIMENSIONS: readonly GroupDimension[] = [
  {
    id: "shape",
    label: "Query shape",
    keyOf: (e) => e.shape.key,
    detailOf: (e) => e.shape.summary,
  },
  { id: "namespace", label: "Namespace", keyOf: (e) => e.namespace },
  { id: "command", label: "Command", keyOf: (e) => e.commandName },
  {
    id: "planSummary",
    label: "Plan summary",
    keyOf: (e) => `${e.namespace} · ${planSummaryKey(e)}`,
    detailOf: planSummaryKey,
  },
  {
    id: "comment",
    label: "Comment",
    keyOf: (e) => e.comment ?? NO_COMMENT,
    recorded: (e) => e.comment !== undefined,
  },
  {
    id: "appName",
    label: "App",
    keyOf: (e) => e.appName ?? NOT_RECORDED,
    recorded: (e) => e.appName !== undefined,
  },
  {
    id: "queryShapeHash",
    label: "queryShapeHash",
    keyOf: (e) => e.planCache.queryShapeHash ?? NOT_RECORDED,
    recorded: (e) => e.planCache.queryShapeHash !== undefined,
  },
  {
    id: "remote",
    label: "Client",
    keyOf: (e) => e.remote ?? NOT_RECORDED,
    recorded: (e) => e.remote !== undefined,
  },
];

export function groupDimensionById(id: GroupDimensionId): GroupDimension {
  const dimension = GROUP_DIMENSIONS.find((d) => d.id === id);
  if (!dimension) throw new Error(`Unknown group dimension: ${id}`);
  return dimension;
}

/** Dimensions worth offering for a log: those at least one entry records. */
export function recordedDimensions(
  entries: readonly SlowQueryEntry[],
): GroupDimension[] {
  return GROUP_DIMENSIONS.filter(
    (d) => d.recorded === undefined || entries.some(d.recorded),
  );
}

/** Groups are labeled by their key, or `namespace · detail` for namespaced dimensions. */
export function groupLabelOf(
  dimension: GroupDimension,
  entry: SlowQueryEntry,
): string {
  return dimension.detailOf
    ? `${entry.namespace} · ${dimension.detailOf(entry)}`
    : dimension.keyOf(entry);
}

function planSummaryKey(entry: SlowQueryEntry): string {
  return entry.planSummary
    ? collapsePlanSummary(entry.planSummary)
    : NOT_RECORDED;
}
