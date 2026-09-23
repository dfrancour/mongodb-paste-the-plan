import type { SlowQueryEntry } from "#types/slow-query";

/** The operation, or the command's own name when it is not a query operation. */
export function OperationPill({ entry }: { readonly entry: SlowQueryEntry }) {
  return (
    <span className="inline-block rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-xs text-neutral-700 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200">
      {entry.operation === "command" ? entry.commandName : entry.operation}
    </span>
  );
}
