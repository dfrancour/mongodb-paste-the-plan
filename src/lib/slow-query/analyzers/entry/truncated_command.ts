import type { EntryAnalyzer } from "../types";

/** The server truncated the logged command, so it cannot be grouped with its shape. */
export const truncatedCommand: EntryAnalyzer = {
  id: "entry:truncated_command",
  label: "Truncated command",
  analyze: (entry) => {
    if (!entry.flags.isTruncated) return [];
    return [
      {
        id: "truncated-command",
        analyzerId: truncatedCommand.id,
        layer: "entry",
        severity: "info",
        category: "queryPattern",
        title: "Command truncated in log",
        description:
          "The command exceeded the log line limit and was truncated, so this entry has a shape of its own.",
        suggestion:
          "Very large commands (long $in lists, big pipelines) are themselves a performance signal; raise maxLogSizeKB only if the full text is needed.",
      },
    ];
  },
};
