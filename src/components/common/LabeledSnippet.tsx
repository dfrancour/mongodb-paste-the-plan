import type { ReactNode } from "react";
import { ExternalLink } from "#components/shared/ExternalLink";

interface LabeledSnippetProps {
  readonly label: string;
  /** A docs page for this row, shown at the right of the label. */
  readonly link?: { readonly href: string; readonly label: string };
  /** A command, path, or menu trail, shown in a monospace block. */
  readonly children: ReactNode;
  /** One line under the block, for the detail the block cannot carry. */
  readonly note?: ReactNode;
}

/** A labelled monospace block for help text: the label says when, the block says what. */
export function LabeledSnippet({
  label,
  link,
  children,
  note,
}: LabeledSnippetProps) {
  return (
    <div className="text-sm text-neutral-700 dark:text-neutral-300">
      <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
        <span className="font-medium">{label}</span>
        {link && <ExternalLink href={link.href}>{link.label}</ExternalLink>}
      </div>
      <code className="block rounded bg-neutral-50 px-2 py-1 font-mono text-xs break-all text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200">
        {children}
      </code>
      {note && (
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {note}
        </p>
      )}
    </div>
  );
}
