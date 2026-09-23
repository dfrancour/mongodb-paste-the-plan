import type { SlowQueryEntry } from "#types/slow-query";
import { buildShellCommand } from "#lib/slow-query";
import { CodeViewer } from "#components/common/CodeViewer";

/**
 * The logged command as the mongosh call that issued it, or the raw command
 * when it has no shell form. A cursor batch shows its originating query,
 * then the getMore itself.
 */
export function EntryCommand({ entry }: { readonly entry: SlowQueryEntry }) {
  const shell = buildShellCommand(entry);
  return (
    <div className="space-y-4">
      {shell ? (
        <Block
          title={entry.originatingCommand ? "originatingCommand" : "command"}
        >
          <CodeViewer
            content={shell}
            copyLabel="Copy command"
            displayFormat="javascript"
          />
        </Block>
      ) : (
        entry.originatingCommand && (
          <Block title="originatingCommand">
            <CodeViewer
              content={entry.originatingCommand}
              copyLabel="Copy originating command"
              displayFormat="json"
            />
          </Block>
        )
      )}
      {(!shell || entry.originatingCommand) && (
        <Block title="command">
          <CodeViewer
            content={entry.command}
            copyLabel="Copy command"
            displayFormat="json"
          />
        </Block>
      )}
    </div>
  );
}

function Block({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="mb-2 font-mono text-xs text-neutral-500 dark:text-neutral-400">
        {title}
      </h4>
      {children}
    </div>
  );
}
