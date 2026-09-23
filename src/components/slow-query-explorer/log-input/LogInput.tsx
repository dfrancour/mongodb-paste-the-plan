"use client";

import { useRef, useState, type ClipboardEvent } from "react";
import {
  ScrollText,
  Upload,
  Play,
  AlertCircle,
  Loader2,
  BookOpen,
} from "lucide-react";
import { SectionCard } from "#components/common/SectionCard";
import { ContributeLink } from "#components/common/ContributeLink";
import { BetaTag } from "../BetaTag";
import { Icon } from "#components/common/Icon";
import { useFileDrop } from "#components/common/useFileDrop";
import { LARGE_LOG_CHARS } from "#hooks/useSlowQueryLoader";
import { formatBytes } from "#lib/utils/formatters";
import { LogHowToUse } from "./LogHowToUse";

interface LogInputProps {
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly onLoad: (text: string) => void;
}

const ACCEPTED_EXTENSIONS = [".jsonl", ".json", ".log", ".txt"];
const EXAMPLE_NAME = "Example log";
const EXAMPLE_URL = "/examples/slow-query-log.jsonl";

const toolbarButtonClass =
  "flex cursor-pointer items-center gap-1 rounded border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600 shadow transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700";

export function LogInput({ isLoading, error, onLoad }: LogInputProps) {
  const [text, setText] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [pendingLarge, setPendingLarge] = useState<{
    text: string;
    name: string | undefined;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = (content: string, name: string | undefined) => {
    setFileError(null);
    if (content.length > LARGE_LOG_CHARS) {
      setPendingLarge({ text: content, name });
      return;
    }
    setPendingLarge(null);
    onLoad(content);
  };

  const loadFile = async (file: File) => {
    if (
      !ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
    ) {
      setFileError(`Choose a ${ACCEPTED_EXTENSIONS.join(", ")} file`);
      return;
    }
    try {
      const content = await file.text();
      setText("");
      load(content, file.name);
    } catch {
      setFileError(`${file.name} could not be read`);
    }
  };

  const loadExample = async () => {
    setFileError(null);
    try {
      const response = await fetch(EXAMPLE_URL);
      if (!response.ok) throw new Error(response.statusText);
      setText("");
      load(await response.text(), EXAMPLE_NAME);
    } catch {
      setFileError("The example log could not be loaded");
    }
  };

  /** A paste into an empty box is the whole log: explore it straight away. */
  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (text.trim()) return;
    const pasted = e.clipboardData.getData("text");
    if (pasted.trim()) load(pasted, undefined);
  };

  const { isDragging, dropProps } = useFileDrop((file) => void loadFile(file));
  const message = fileError ?? error;

  const toolbar = (
    <>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className={toolbarButtonClass}
      >
        <Upload className="h-3 w-3" />
        Upload
      </button>
      <button
        type="button"
        onClick={() => void loadExample()}
        disabled={isLoading}
        className={toolbarButtonClass}
      >
        <BookOpen className="h-3 w-3" />
        Example
      </button>
    </>
  );

  return (
    <SectionCard
      title="MongoDB Slow Query Explorer"
      titleBadge={<BetaTag />}
      icon={<Icon icon={ScrollText} variant="primary" />}
      headerAction={<ContributeLink />}
      featured
    >
      <div className="space-y-4">
        <LogHowToUse />
        <div>
          <label htmlFor="slowQueryLog" className="sr-only">
            Slow query log lines
          </label>
          <div className="relative" {...dropProps}>
            <textarea
              id="slowQueryLog"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setFileError(null);
              }}
              onPaste={onPaste}
              rows={8}
              spellCheck={false}
              placeholder="Paste log lines, drop a file, or load the example"
              className={`focus:ring-primary focus:border-primary w-full rounded-md border bg-white px-3 py-2 font-mono text-sm text-neutral-900 placeholder-neutral-500 shadow-sm dark:bg-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-400 ${
                isDragging
                  ? "border-primary border-2 border-dashed"
                  : "border-neutral-300 dark:border-neutral-600"
              }`}
            />
            {isDragging ? (
              <div className="pointer-events-none absolute inset-0 hidden flex-col items-center justify-center rounded-md bg-white/90 sm:flex dark:bg-neutral-800/90">
                <Icon icon={Upload} size="lg" variant="primary" />
                <span className="mt-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Drop the log file here
                </span>
              </div>
            ) : (
              <div className="absolute top-2 right-2 z-10 hidden gap-1 sm:flex">
                {toolbar}
              </div>
            )}
          </div>
          <div className="flex gap-1 pt-2 sm:hidden">{toolbar}</div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(",")}
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void loadFile(file);
            }}
          />
        </div>

        {message && (
          <div className="text-performance-poor flex items-start gap-2 text-sm">
            <Icon icon={AlertCircle} size="sm" variant="error" />
            <span>{message}</span>
          </div>
        )}

        {pendingLarge && (
          <div className="container-info flex flex-wrap items-center gap-3 text-sm">
            <span>
              {pendingLarge.name ?? "The pasted log"} is{" "}
              {formatBytes(pendingLarge.text.length)}; parsing it will take a
              while.
            </span>
            <button
              type="button"
              onClick={() => {
                setPendingLarge(null);
                onLoad(pendingLarge.text);
              }}
              className="btn-secondary btn-small"
            >
              Parse anyway
            </button>
            <button
              type="button"
              onClick={() => setPendingLarge(null)}
              className="btn-secondary btn-small"
            >
              Cancel
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => load(text, undefined)}
          disabled={!text.trim() || isLoading}
          className="btn-primary flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Icon icon={Play} size="sm" variant="inherit" />
          )}
          {isLoading ? "Parsing…" : "Explore logs"}
        </button>
      </div>
    </SectionCard>
  );
}
