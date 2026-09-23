import type { PlanSummaryStage } from "#types/slow-query";

/**
 * Parse a `planSummary` string such as
 * `IXSCAN { status: 1, region: 1 }, IXSCAN { status: 1, region: 1 }` into
 * stage tokens. Key patterns keep their original text.
 */
export function parsePlanSummary(text: string): PlanSummaryStage[] {
  const stages: PlanSummaryStage[] = [];
  const stagePattern = /[A-Z][A-Z0-9_]*/g;
  let match: RegExpExecArray | null;
  while ((match = stagePattern.exec(text)) !== null) {
    const stage = match[0];
    const afterStage = text.slice(stagePattern.lastIndex);
    const keyPattern = readBalancedBraces(afterStage);
    if (keyPattern !== undefined) {
      stagePattern.lastIndex +=
        afterStage.indexOf(keyPattern) + keyPattern.length;
      stages.push({ stage, keyPattern });
    } else {
      stages.push({ stage });
    }
  }
  return stages;
}

/**
 * Each distinct stage once, in first-seen order, with a count when it
 * repeats: `3× IXSCAN { a: 1 }, COLLSCAN`. Sharded and `$or` plans list one
 * stage per shard or branch, so the raw text grows without bound while the
 * distinct stages stay few.
 */
export function collapsePlanSummary(text: string): string {
  const stages = parsePlanSummary(text);
  if (stages.length < 2) return text;
  const counts = new Map<string, number>();
  for (const stage of stages) {
    const key = renderStage(stage);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts]
    .map(([stage, count]) => (count > 1 ? `${count}× ${stage}` : stage))
    .join(", ");
}

function renderStage(stage: PlanSummaryStage): string {
  return stage.keyPattern ? `${stage.stage} ${stage.keyPattern}` : stage.stage;
}

function readBalancedBraces(text: string): string | undefined {
  const start = text.search(/\S/);
  if (start === -1 || text[start] !== "{") return undefined;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return undefined;
}
